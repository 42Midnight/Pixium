import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CoverAdjustModal from '../common/CoverAdjustModal';
import TitleBar from '../common/TitleBar';
import { fileToBuffer, sanitizeFolderName } from '../../utils/file';
import { isElectronAvailable } from '../../services/electron';
import type { Collection } from '../../types';
import '../CreateCollection/CreateCollection.css';

export default function EditCollection() {
  const navigate = useNavigate();
  const location = useLocation();
  const originalCollection = location.state?.collection as Collection | undefined;

  const [title, setTitle] = useState(originalCollection?.name || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [coverPosition, setCoverPosition] = useState(originalCollection?.coverPosition ?? 50);
  const [isAdjustingCover, setIsAdjustingCover] = useState(false);
  const [coverDeleted, setCoverDeleted] = useState(false);

  useEffect(() => {
    if (!originalCollection?.cover) return;
    const expectedPath = `image/collection_covers/${originalCollection.folder}/cover.`;
    if (!originalCollection.cover.includes(expectedPath)) return;
    setImagePreview(originalCollection.cover);
  }, [originalCollection]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('请选择图片文件'); return; }
    setSelectedFile(file);
    setCoverDeleted(false);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) { alert('请选择图片文件'); return; }
    setSelectedFile(file);
    setCoverDeleted(false);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { alert('请输入相册名称'); return; }
    if (!originalCollection) { alert('相册数据不存在'); return; }

    if (title.trim() !== originalCollection.name && isElectronAvailable()) {
      const result = await window.electronAPI!.readCollections();
      if (result.success) {
        const exists = (result.data.collections || []).some(
          c => c.id !== originalCollection.id && c.name === title.trim()
        );
        if (exists) { alert('已存在同名相册，请修改名称后重试'); return; }
      }
    }

    setIsSaving(true);
    try {
      const api = window.electronAPI;
      let newCover = originalCollection.cover;
      if (coverDeleted) newCover = null;

      if (selectedFile && api) {
        const coverFolderName = `collection_covers/${originalCollection.folder}`;
        await api.createFolder(coverFolderName);
        const ext = selectedFile.name.split('.').pop() ?? 'jpg';
        const buffer = await fileToBuffer(selectedFile);
        await api.saveImage(`${coverFolderName}/cover.${ext}`, buffer);
        const urlResult = await api.getImageURL(`image/${coverFolderName}/cover.${ext}`);
        if (urlResult.success && urlResult.url) newCover = urlResult.url;
      }

      // Rename if title changed
      const nameChanged = title.trim() !== originalCollection.name;
      if (nameChanged && api) {
        const newFolderName = sanitizeFolderName(title.trim());
        const renameResult = await api.renameFolder(originalCollection.folder, newFolderName);
        if (!renameResult.success) {
          alert('重命名文件夹失败：' + renameResult.error);
          setIsSaving(false);
          return;
        }
      }

      if (api) {
        // Handle cover folder rename before reading collections
        if (nameChanged && newCover) {
          const newFolderName = sanitizeFolderName(title.trim());
          await api.renameFolder(`collection_covers/${originalCollection.folder}`, `collection_covers/${newFolderName}`);
          const fileName = newCover.split('/').pop()!;
          const urlResult = await api.getImageURL(`image/collection_covers/${newFolderName}/${fileName}`);
          if (urlResult.success && urlResult.url) newCover = urlResult.url;
        }

        // Read fresh data (rename-folder already fixed paths in collections.json)
        const result = await api.readCollections();
        if (result.success) {
          const newFolderName = nameChanged ? sanitizeFolderName(title.trim()) : originalCollection.folder;
          const updated = result.data.collections.map(c => {
            if (c.id !== originalCollection.id) return c;
            return {
              ...c,
              name: title.trim(),
              cover: newCover,
              coverPosition,
              folder: newFolderName,
            };
          });
          await api.saveCollections({ collections: updated });
        }
      }

      navigate('/');
    } catch (error: any) {
      console.error('更新相册失败:', error);
      alert('更新相册失败：' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="create-collection-container">
      <TitleBar title="编辑相册" onBack={() => navigate('/')} />

        <form className="create-collection-form" onSubmit={handleSubmit}>
          <div className="create-collection-left">
            <div className="title-input-section">
              <label className="input-label">相册名称</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="请输入相册名称" className="title-input" required />
            </div>
            <div className="cover-upload-section">
              <h3 className="section-title">封面图片</h3>
              <div
                className={`cover-upload-area ${isDragging ? 'dragging' : ''}`}
                onDragEnter={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
              >
                {imagePreview ? (
                  <div className="cover-preview-wrapper">
                    <div className="cover-preview" style={{ backgroundImage: `url(${imagePreview})`, backgroundSize: 'cover', backgroundPosition: `${coverPosition}% 50%` }} />
                    <button type="button" className="remove-cover-btn" onClick={() => { setSelectedFile(null); setImagePreview(null); setCoverDeleted(true); }}>×</button>
                    <button type="button" className="cover-adjust-btn" onClick={() => setIsAdjustingCover(true)}>手动调整</button>
                  </div>
                ) : (
                  <label className="cover-upload-label">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="cover-upload-input" />
                    <div className="upload-placeholder">
                      <span className="upload-icon">+</span>
                      <span className="upload-text">{isDragging ? '松开鼠标上传封面' : '点击或拖拽封面图片到此处'}</span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>
          <div className="create-collection-footer">
            <button type="submit" className="submit-btn" disabled={isSaving || !title.trim()}>
              {isSaving ? '确定中...' : '确定'}
            </button>
          </div>
        </form>

        {isAdjustingCover && (
          <CoverAdjustModal
            imageUrl={imagePreview}
            initialPosition={coverPosition}
            onConfirm={(pos) => { setCoverPosition(pos); setIsAdjustingCover(false); }}
            onCancel={() => setIsAdjustingCover(false)}
          />
        )}
      </div>

  );
}

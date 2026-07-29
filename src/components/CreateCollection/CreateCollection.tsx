import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CoverAdjustModal from '../common/CoverAdjustModal';
import TitleBar from '../common/TitleBar';
import { useSettings } from '../../hooks/useSettings';
import { fileToBuffer, sanitizeFolderName } from '../../utils/file';
import { getNow } from '../../utils/format';
import { isElectronAvailable } from '../../services/electron';
import type { Collection } from '../../types';
import styles from './CreateCollection.module.css';

export default function CreateCollection() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [coverPosition, setCoverPosition] = useState(50);
  const [isAdjustingCover, setIsAdjustingCover] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('请选择图片文件'); return; }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
  }, [title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) { alert('请选择图片文件'); return; }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
  }, [title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { alert('请输入相册名称'); return; }
    setIsSaving(true);

    try {
      const api = window.electronAPI;
      const collectionId = `collection_${Date.now()}`;
      const folderName = sanitizeFolderName(title.trim()) || collectionId;

      if (api) {
        const result = await api.readCollections();
        if (result.success) {
          const exists = (result.data.collections || []).some(
            c => c.name === title.trim() || c.folder === folderName
          );
          if (exists) { alert('已存在同名相册，请修改名称后重试'); setIsSaving(false); return; }
        }
      }

      const newCollection: Collection = {
        id: collectionId,
        name: title.trim(),
        folder: folderName,
        cover: null,
        coverPosition,
        images: [],
        createdAt: getNow(),
      };

      if (api) {
        await api.createFolder(folderName);

        if (selectedFile) {
          const coverFolderName = `collection_covers/${folderName}`;
          await api.createFolder(coverFolderName);
          const ext = selectedFile.name.split('.').pop() ?? 'jpg';
          const fileName = `cover.${ext}`;
          const buffer = await fileToBuffer(selectedFile);
          await api.saveImage(`${coverFolderName}/${fileName}`, buffer);
          const urlResult = await api.getImageURL(`image/${coverFolderName}/${fileName}`);
          if (urlResult.success && urlResult.url) {
            newCollection.cover = urlResult.url;
          }
        }

        const result = await api.readCollections();
        if (result.success) {
          const collections = result.data.collections || [];
          const updated = settings.collectionSortOrder === 'asc'
            ? [newCollection, ...collections]
            : [...collections, newCollection];
          await api.saveCollections({ collections: updated });
        }
      }

      navigate('/');
    } catch (error: any) {
      console.error('创建相册失败:', error);
      alert('创建相册失败：' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.createCollectionContainer}>
      <TitleBar title="新建相册" onBack={() => navigate('/')} />

        <form className={styles.createCollectionForm} onSubmit={handleSubmit}>
          <div className={styles.createCollectionLeft}>
            <div className={styles.coverUploadSection}>
              <h3 className={styles.sectionTitle}>封面图片</h3>
              <div className={styles.titleInputSection}>
                <label className={styles.inputLabel}>相册名称</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="请输入相册名称"
                  className={styles.titleInput}
                  required
                  spellCheck={false}
                />
              </div>
              <div
                className={`${styles.coverUploadArea} ${isDragging ? styles.dragging : ''}`}
                onDragEnter={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
              >
                {imagePreview ? (
                  <div className={styles.coverContentWrapper}>
                    <div className={styles.coverPreviewWrapper}>
                      <div className={styles.coverPreview} style={{ backgroundImage: `url(${imagePreview})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      <button type="button" className={styles.removeCoverBtn} onClick={() => { setSelectedFile(null); setImagePreview(null); }}>×</button>
                    </div>
                    <div className={styles.coverActionWrapper}>
                      <button type="button" className={styles.coverAdjustBtn} onClick={() => setIsAdjustingCover(true)}>手动调整</button>
                    </div>
                  </div>
                ) : (
                  <label className={styles.coverUploadLabel}>
                    <input type="file" accept="image/*" onChange={handleFileChange} className={styles.coverUploadInput} />
                    <div className={styles.uploadPlaceholder}>
                      <span className={styles.uploadIcon}>+</span>
                      <span className={styles.uploadText}>{isDragging ? '松开鼠标上传封面' : '点击或拖拽封面图片到此处'}</span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>
          <div className={styles.createCollectionFooter}>
            <button type="submit" className={styles.submitBtn} disabled={isSaving || !title.trim()}>
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

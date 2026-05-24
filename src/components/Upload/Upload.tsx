import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../../hooks/useSettings';
import { useCollections } from '../../hooks/useCollections';
import { fileToBuffer, sanitizeFolderName } from '../../utils/file';
import { getNow } from '../../utils/format';
import CoverAdjustModal from '../common/CoverAdjustModal';
import ImagePreview from './ImagePreview';
import PromptEditor from './PromptEditor';
import TitleBar from '../common/TitleBar';
import type { CollectionMode, TemplateField, WorkData } from '../../types';
import './Upload.css';

export default function Upload() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const { collections, loadCollections } = useCollections();

  const editMode = location.state?.editMode === true;
  const editWorkData = location.state?.workData as WorkData | undefined;

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [title, setTitle] = useState(editWorkData?.title || '');
  const [promptFields, setPromptFields] = useState<TemplateField[]>([{ name: '', value: '' }]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [collectionMode, setCollectionMode] = useState<CollectionMode>('pixiv');
  const [batchImport, setBatchImport] = useState(false);
  const [coverPosition, setCoverPosition] = useState(editWorkData?.coverPosition ?? 50);
  const [coverPositionVertical, setCoverPositionVertical] = useState(editWorkData?.coverPositionVertical ?? false);
  const [isAdjustingCover, setIsAdjustingCover] = useState(false);
  const [originalFolder, setOriginalFolder] = useState<string | null>(editWorkData?.folder || null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingImage, setDraggingImage] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState(-1);
  const editDataLoadedRef = useRef(false);

  // Load collections on mount
  useEffect(() => { loadCollections(); }, [loadCollections]);

  // Set initial collection from route state (locked - cannot be changed)
  useEffect(() => {
    if (!selectedCollection) {
      const collId = location.state?.collectionId || editWorkData?.collectionId;
      if (collId) {
        setSelectedCollection(collId);
      } else {
        const collFolder = location.state?.collectionFolder as string | undefined;
        if (collFolder) {
          const coll = collections.find(c => c.folder === collFolder);
          if (coll) setSelectedCollection(coll.id);
        }
      }
    }
  }, [location.state, editWorkData, selectedCollection, collections]);

  // Load edit data (only once)
  useEffect(() => {
    if (!editMode || !editWorkData || editDataLoadedRef.current) return;
    editDataLoadedRef.current = true;
    if (editWorkData.prompt) {
      setPromptFields(Object.entries(editWorkData.prompt).map(([name, value]) => ({ name, value })));
    }
    if (editWorkData.collectionId) setSelectedCollection(editWorkData.collectionId);
    if (editWorkData.images?.length) {
      const urls = editWorkData.images.map(img => {
        // Already a full protocol URL
        if (img.startsWith('pixium://') || img.startsWith('file://')) return img;
        // Build path: cover is already a full URL with protocol, we can extract the pattern
        if (editWorkData.cover) {
          // cover looks like pixium:///image/safe/work1/img.jpg or file:///.../image/safe/work1/img.jpg
          let base = editWorkData.cover;
          let prefix = '';
          for (const p of ['pixium:///', 'pixium://', 'file:///', 'file://']) {
            if (base.startsWith(p)) { prefix = p; base = base.substring(p.length); break; }
          }
          // base is now like "image/safe/work1/img.jpg"
          const lastSep = base.lastIndexOf('/');
          if (lastSep !== -1) {
            const dir = base.substring(0, lastSep);
            return `${prefix}${dir}/${img}`;
          }
        }
        // Fallback: use folder
        if (editWorkData.folder) {
          return `file:///image/${editWorkData.folder}/${img}`;
        }
        return `file:///image/${img}`;
      });
      setPreviewImages(urls);
    }
    if (editWorkData.folder) setOriginalFolder(editWorkData.folder);
  }, [editMode, editWorkData]);

  // Update collection mode when selection changes
  const currentCollection = collections.find(c => c.id === selectedCollection);
  useEffect(() => {
    if (currentCollection) setCollectionMode(currentCollection.mode || 'pixiv');
  }, [currentCollection]);

  // Handle files
  const handleFiles = useCallback((files: File[], append = false) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) { alert('请选择图片文件'); return; }
    const urls = imageFiles.map(f => URL.createObjectURL(f));

    if (append) {
      setSelectedFiles(prev => [...prev, ...imageFiles]);
      setPreviewImages(prev => [...prev, ...urls]);
    } else {
      previewImages.forEach(u => URL.revokeObjectURL(u));
      setSelectedFiles(imageFiles);
      setPreviewImages(urls);
      setCoverPosition(50);
    }
  }, [previewImages]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(Array.from(e.target.files), true);
    e.target.value = '';
  }, [handleFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.getData('isInternalDrag') === 'true') {
      if (draggingImage && dragOverIndex !== -1) {
        setSelectedFiles(displayFiles);
        setPreviewImages(displayImages);
      }
      setDragOverIndex(-1);
      setDraggingImage(null);
      return;
    }
    if (e.dataTransfer.files.length) handleFiles(Array.from(e.dataTransfer.files), true);
  }, [handleFiles, draggingImage, dragOverIndex]);

  // Derived display order for drag-sort
  const displayImages = useMemo(() => {
    if (!draggingImage || dragOverIndex === -1) return previewImages;
    const arr = [...previewImages];
    const idx = arr.indexOf(draggingImage);
    if (idx === -1) return previewImages;
    const removed = arr.splice(idx, 1)[0];
    arr.splice(Math.max(0, Math.min(dragOverIndex, arr.length)), 0, removed);
    return arr;
  }, [draggingImage, dragOverIndex, previewImages]);

  const displayFiles = useMemo(() => {
    if (!draggingImage || dragOverIndex === -1) return selectedFiles;
    const idx = previewImages.indexOf(draggingImage);
    if (idx === -1) return selectedFiles;
    const arr = [...selectedFiles];
    const removed = arr.splice(idx, 1)[0];
    arr.splice(Math.max(0, Math.min(dragOverIndex, arr.length)), 0, removed);
    return arr;
  }, [draggingImage, dragOverIndex, selectedFiles, previewImages]);

  const removeFile = useCallback((index: number) => {
    URL.revokeObjectURL(previewImages[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
  }, [previewImages]);

  const clearAllFiles = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    previewImages.forEach(u => URL.revokeObjectURL(u));
    setSelectedFiles([]);
    setPreviewImages([]);
  }, [previewImages]);

  const collectionFolder = location.state?.collectionFolder as string | undefined;

  const goBack = useCallback(() => {
    if (editMode) {
      // Prefer the original fileName (full path), then build from folder+image, then just folder
      let detailFileName: string | null = null;
      if (typeof editWorkData?.fileName === 'string' && editWorkData.fileName) {
        detailFileName = editWorkData.fileName;
      } else if (originalFolder && editWorkData?.images?.[0]) {
        detailFileName = `${originalFolder}/${editWorkData.images[0]}`;
      } else if (originalFolder) {
        detailFileName = originalFolder;
      }
      if (detailFileName) {
        navigate(`/detail/${encodeURIComponent(detailFileName)}`, {
          state: { collectionFolder, collectionId: location.state?.collectionId ?? editWorkData?.collectionId, previousPath: location.state?.previousPath }
        });
        return;
      }
    }
    if (collectionFolder) {
      navigate(`/${collectionFolder}`);
    } else {
      navigate('/');
    }
  }, [editMode, originalFolder, editWorkData, navigate, collectionFolder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collections.length) { alert('请先添加相册'); return; }
    if (!selectedCollection) { alert('未找到所属相册'); return; }

    const api = window.electronAPI;
    const collectionFolder = currentCollection?.folder || '';
    const workFolderName = title ? sanitizeFolderName(title) : (selectedFiles[0]?.name.replace(/\.[^/.]+$/, '') || `upload_${Date.now()}`).replace(/[<>:"/\\|?*]/g, '_');

    // Check for duplicate in non-edit, non-batch mode
    if (!editMode && !batchImport && api) {
      const result = await api.readCollections();
      if (result.success) {
        const coll = (result.data.collections || []).find(c => c.id === selectedCollection);
        if (coll?.images?.some((p: string) => p.split('/').pop() === workFolderName)) {
          alert('已存在同名作品，请修改标题后重试');
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const prompt: Record<string, string> = {};
      if (collectionMode === 'pixiv') {
        promptFields.forEach(f => { if (f.name && f.value) prompt[f.name] = f.value; });
      }

      let folderName: string | null = null;
      let imageFileNames: string[] = [];
      const batchWorkPaths: string[] = [];

      if (batchImport) {
        // Batch: each file is its own work
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const fileTitle = file.name.replace(/\.[^/.]+$/, '');
          const singleFolder = sanitizeFolderName(fileTitle);
          const singlePath = collectionFolder ? `${collectionFolder}/${singleFolder}` : singleFolder;

          if (api) {
            await api.createFolder(singlePath);
            const buffer = await fileToBuffer(file);
            await api.saveImage(`${singlePath}/${file.name}`, buffer);

            const coverResult = await api.getImageURL(`image/${singlePath}/${file.name}`);
            const coverUrl = coverResult.success && coverResult.url ? coverResult.url : '';
            const jsonData = {
              title: fileTitle, prompt: collectionMode === 'pixiv' ? { ...prompt } : null,
              images: [file.name], cover: coverUrl || undefined, folder: singlePath,
              createdAt: getNow(), coverPosition, coverPositionVertical,
            };
            const encoder = new TextEncoder();
            await api.saveImage(`${singlePath}/info.json`, Array.from(encoder.encode(JSON.stringify(jsonData, null, 2))));
          }
          batchWorkPaths.push(singlePath);
          if (folderName === null) folderName = singlePath;
          imageFileNames.push(file.name);
        }
      } else {
        // Normal: all files in one folder
        folderName = editMode && originalFolder ? originalFolder :
          collectionFolder ? `${collectionFolder}/${workFolderName}` : workFolderName;

        // If title changed, rename folder
        if (editMode && originalFolder && title !== editWorkData?.title && api) {
          const targetCollFolder = currentCollection?.folder || '';
          const newFolderName = targetCollFolder
            ? `${targetCollFolder}/${sanitizeFolderName(title || workFolderName)}`
            : sanitizeFolderName(title || workFolderName);
          await api.renameFolder(folderName, newFolderName);
          folderName = newFolderName;
        }

        if (!editMode && api) await api.createFolder(folderName);

        // Build originalUrls consistent with how edit previews are constructed
        const originalUrls = new Set<string>();
        if (editWorkData?.images && editWorkData.cover) {
          // Extract protocol prefix and base dir from cover
          let base = editWorkData.cover;
          let prefix = '';
          for (const p of ['pixium:///', 'pixium://', 'file:///', 'file://']) {
            if (base.startsWith(p)) { prefix = p; base = base.substring(p.length); break; }
          }
          const lastSep = base.lastIndexOf('/');
          const dir = lastSep !== -1 ? base.substring(0, lastSep) : '';

          editWorkData.images.forEach(img => {
            if (img.startsWith('pixium://') || img.startsWith('file://')) {
              originalUrls.add(img);
            } else if (dir) {
              originalUrls.add(`${prefix}${dir}/${img}`);
            } else {
              originalUrls.add(`${prefix}${img}`);
            }
          });
        }

        // Delete removed images in edit mode
        if (editMode && originalFolder && editWorkData?.images) {
          const remainingPreviews = previewImages.filter(u => originalUrls.has(u));
          const remainingNames: string[] = [];
          for (const rp of remainingPreviews) {
            // Find which original image this preview URL corresponds to
            for (const o of originalUrls) {
              if (o === rp) {
                const idx = [...originalUrls].indexOf(o);
                if (editWorkData.images[idx]) remainingNames.push(editWorkData.images[idx]);
                break;
              }
            }
          }
          const deleted = editWorkData.images.filter((img: string) => !remainingNames.includes(img));
          for (const df of deleted) {
            if (api) await api.deleteFile(`${folderName}/${df}`);
          }
        }

        // Build final image list preserving order from preview
        let newFileIdx = 0;
        for (const previewUrl of previewImages) {
          if (originalUrls.has(previewUrl)) {
            // Old image — find its original filename
            const idx = [...originalUrls].indexOf(previewUrl);
            const origImg = editWorkData?.images?.[idx];
            if (origImg) imageFileNames.push(origImg);
          } else if (newFileIdx < selectedFiles.length) {
            // New image
            const file = selectedFiles[newFileIdx];
            imageFileNames.push(file.name);
            if (api) {
              const buffer = await fileToBuffer(file);
              await api.saveImage(`${folderName}/${file.name}`, buffer);
            }
            newFileIdx++;
          }
        }

        // Save info.json to CURRENT folderName (which has been updated after move/rename)
        if (api) {
          let coverUrl = '';
          if (imageFileNames.length > 0) {
            const urlResult = await api.getImageURL(`image/${folderName}/${imageFileNames[0]}`);
            if (urlResult.success && urlResult.url) coverUrl = urlResult.url;
          }
          const jsonData = {
            title: title || workFolderName,
            prompt: Object.keys(prompt).length > 0 ? prompt : null,
            images: imageFileNames,
            cover: coverUrl || undefined,
            folder: folderName,
            createdAt: editMode ? editWorkData?.createdAt || getNow() : getNow(),
            coverPosition, coverPositionVertical,
          };
          const encoder = new TextEncoder();
          await api.saveImage(`${folderName}/info.json`, Array.from(encoder.encode(JSON.stringify(jsonData, null, 2))));
        }
      }

      // Add to collection (non-edit mode)
      if (!editMode && selectedCollection && api) {
        const result = await api.readCollections();
        if (result.success) {
          const updated = (result.data.collections || []).map(c =>
            c.id === selectedCollection
              ? { ...c, images: [...(c.images || []), ...(batchImport ? batchWorkPaths : folderName ? [folderName] : [])] }
              : c
          );
          await api.saveCollections({ collections: updated });
        }
      }

      // Navigate back
      if (editMode) {
        // Build the detail file path: prefer the current folder + first image, fall back to original fileName
        let detailFileName: string | null = null;
        if (folderName && imageFileNames.length > 0) {
          detailFileName = `${folderName}/${imageFileNames[0]}`;
        } else if (typeof editWorkData?.fileName === 'string' && editWorkData.fileName) {
          detailFileName = editWorkData.fileName;
        } else if (originalFolder) {
          detailFileName = originalFolder;
        }
        if (detailFileName) {
          const targetColl = collections.find(c => c.id === selectedCollection);
          const targetCollFolder = targetColl?.folder || collectionFolder;
          navigate(`/detail/${encodeURIComponent(detailFileName)}`, {
            state: { collectionFolder: targetCollFolder, collectionId: selectedCollection, previousPath: location.state?.previousPath }
          });
        } else {
          goBack();
        }
      } else {
        goBack();
      }
    } catch (error: any) {
      console.error('保存失败:', error);
      alert('保存失败：' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const previewDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('isInternalDrag', 'true');
    e.dataTransfer.effectAllowed = 'move';
    setDraggingImage(previewImages[index]);
    setDragOverIndex(-1);
  }, [previewImages]);

  const previewDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggingImage) setDragOverIndex(index);
  }, [draggingImage]);

  return (
    <div className="upload-container">
      <TitleBar title={editMode ? '编辑作品' : '上传作品'} onBack={goBack} />

      <form className="upload-form" onSubmit={handleSubmit}>
        <div className="upload-left">
          {!batchImport && (
            <div className="title-input-section">
              <label className="input-label">标题</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="请输入标题（可选，默认为文件名）" className="title-input" spellCheck={false} />
            </div>
          )}

          {!editMode && (
            <div className="batch-import-section">
              <label className="input-label">导入方式</label>
              <div className="import-options">
                <label className={`import-option ${!batchImport ? 'selected' : ''}`}>
                  <input type="radio" name="importMode" checked={!batchImport} onChange={() => setBatchImport(false)} />
                  <span>合并为一个作品</span>
                </label>
                <label className={`import-option ${batchImport ? 'selected' : ''}`}>
                  <input type="radio" name="importMode" checked={batchImport} onChange={() => setBatchImport(true)} />
                  <span>批量导入（每张图片单独一个作品）</span>
                </label>
              </div>
            </div>
          )}

          <div className="image-upload-container">
            <div className={`image-upload-area ${isDragging ? 'dragging' : ''}`}
              onDragEnter={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}>
              <input id="file-input" type="file" multiple accept="image/*" onChange={handleFileSelect} className="file-input" />
              <ImagePreview
                previewImages={previewImages} selectedFiles={selectedFiles}
                draggingImage={draggingImage} dragOverIndex={dragOverIndex}
                onDragStart={previewDragStart} onDragOver={previewDragOver} onDrop={handleDrop}
                onRemove={removeFile} onClearAll={clearAllFiles} />
            </div>
          </div>

          {!batchImport && previewImages.length > 0 && (
            <div className="cover-preview-section">
              <div className="cover-preview-header"><span className="cover-title">封面预览</span></div>
              <div className="cover-adjust-container">
                <button type="button" className="cover-adjust-btn" onClick={() => setIsAdjustingCover(true)}>手动调整</button>
              </div>
              <div className="cover-preview-container">
                <div className="cover-preview" style={{
                  backgroundImage: `url(${displayImages[0]})`,
                  backgroundSize: 'cover',
                  backgroundPosition: coverPositionVertical ? `50% ${coverPosition}%` : `${coverPosition}% 50%`,
                }} />
              </div>
            </div>
          )}

          {isAdjustingCover && (
            <CoverAdjustModal imageUrl={previewImages[0]} initialPosition={coverPosition}
              onConfirm={(pos, isVertical) => { setCoverPosition(pos); setCoverPositionVertical(isVertical); setIsAdjustingCover(false); }}
              onCancel={() => setIsAdjustingCover(false)} />
          )}
        </div>

        {collectionMode === 'pixiv' && (
          <div className="upload-right">
            <PromptEditor fields={promptFields} onChange={setPromptFields} />
          </div>
        )}

        <div className="upload-footer">
          <button type="submit" className="submit-button" disabled={isSaving || (selectedFiles.length === 0 && previewImages.length === 0)}>
            {isSaving ? '保存中...' : '确定'}
          </button>
        </div>
      </form>
    </div>
  );
}

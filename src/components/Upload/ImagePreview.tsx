import { useMemo } from 'react';

interface ImagePreviewProps {
  previewImages: string[];
  selectedFiles: File[];
  draggingImage: string | null;
  dragOverIndex: number;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent) => void;
  onRemove: (index: number) => void;
  onClearAll: (e: React.MouseEvent) => void;
}

export default function ImagePreview({
  previewImages, selectedFiles, draggingImage, dragOverIndex,
  onDragStart, onDragOver, onDrop, onRemove, onClearAll,
}: ImagePreviewProps) {
  const displayImages = useMemo(() => {
    if (!draggingImage || dragOverIndex === -1) return previewImages;
    const newImages = [...previewImages];
    const removeIndex = newImages.indexOf(draggingImage);
    if (removeIndex === -1) return previewImages;
    const removed = newImages.splice(removeIndex, 1)[0];
    const insertIndex = Math.max(0, Math.min(dragOverIndex, newImages.length));
    newImages.splice(insertIndex, 0, removed);
    return newImages;
  }, [draggingImage, dragOverIndex, previewImages]);

  const displayFiles = useMemo(() => {
    if (!draggingImage || dragOverIndex === -1) return selectedFiles;
    const idx = previewImages.indexOf(draggingImage);
    if (idx === -1) return selectedFiles;
    const newFiles = [...selectedFiles];
    const removed = newFiles.splice(idx, 1)[0];
    const insertIndex = Math.max(0, Math.min(dragOverIndex, newFiles.length));
    newFiles.splice(insertIndex, 0, removed);
    return newFiles;
  }, [draggingImage, dragOverIndex, selectedFiles, previewImages]);

  if (previewImages.length === 0) {
    return (
      <>
        <div className="upload-icon">+</div>
        <p className="upload-text">点击或拖拽多张图片到此处上传</p>
      </>
    );
  }

  return (
    <div className="preview-section">
      <div className="preview-header">
        <span className="preview-title">预览图片 ({previewImages.length})</span>
        <button className="clear-all-btn" onClick={onClearAll}>清空全部</button>
      </div>
      <div className="preview-images">
        {displayImages.map((image, index) => {
          const isDragging = draggingImage === image;
          return (
            <div key={index} className={`preview-image-wrapper ${isDragging ? 'dragging' : ''}`}
              draggable="true"
              onDragStart={e => onDragStart(e, index)}
              onDragOver={e => onDragOver(e, index)}
              onDrop={onDrop}>
              <img src={image} alt={`预览 ${index + 1}`} className="preview-image" />
              {displayFiles[index] && <span className="image-filename">{displayFiles[index].name}</span>}
              <button type="button" className="remove-image-btn" onClick={e => {
                e.stopPropagation();
                const originalIndex = previewImages.indexOf(image);
                onRemove(originalIndex !== -1 ? originalIndex : index);
              }}>×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

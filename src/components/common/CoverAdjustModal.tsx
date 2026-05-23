import { useState, useCallback, useEffect, useRef } from 'react';
import { getCoverBackgroundPosition, getCoverImageTransform } from '../../utils/format';
import './common.css';

interface ImageDimensions {
  width: number;
  height: number;
}

interface CoverAdjustModalProps {
  imageUrl: string | null;
  initialPosition?: number;
  onConfirm: (position: number, isVertical: boolean) => void;
  onCancel: () => void;
}

export default function CoverAdjustModal({
  imageUrl,
  initialPosition = 50,
  onConfirm,
  onCancel,
}: CoverAdjustModalProps) {
  const [position, setPosition] = useState(initialPosition);
  const [dimensions, setDimensions] = useState<ImageDimensions>({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedRef.current = false;
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { width, height } = dimensions;
      if (width <= 0 || height <= 0) return;

      const isHorizontal = width > height;
      const delta = isHorizontal
        ? e.clientX - dragStartRef.current.x
        : e.clientY - dragStartRef.current.y;

      if (isHorizontal) dragStartRef.current.x = e.clientX;
      else dragStartRef.current.y = e.clientY;

      const sensitivity = 0.5;
      setPosition(prev => {
        const next = prev + delta * sensitivity;
        return Math.max(0, Math.min(100, next));
      });

      if (Math.abs(delta) > 5) hasDraggedRef.current = true;
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dimensions]);

  if (!imageUrl) return null;

  const bgPos = getCoverBackgroundPosition(position, dimensions);
  const imgTransform = getCoverImageTransform(position, dimensions);

  return (
    <div className="dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !hasDraggedRef.current) onCancel(); }}>
      <div className="cover-modal" onClick={e => e.stopPropagation()}>
        <div className="cover-modal-header">
          <span className="cover-modal-title">调整封面</span>
          <button type="button" className="cover-modal-close" onClick={onCancel} />
        </div>
        <div className="cover-modal-content">
          <div className="cover-crop-area" onMouseDown={handleDragStart}>
            <div className="cover-crop-image-wrapper">
              <img
                src={imageUrl}
                alt="调整封面"
                className="cover-crop-image"
                onLoad={handleImageLoad}
                style={{ transform: imgTransform }}
                draggable={false}
              />
            </div>
            <div className="cover-crop-frame" />
          </div>
        </div>
        <div className="cover-modal-footer">
          <button type="button" className="cover-modal-confirm" onClick={() => onConfirm(position, dimensions.height > dimensions.width)}>
            确定
          </button>
          <button type="button" className="cover-modal-reset" onClick={() => { setPosition(50); setIsDragging(false); }}>
            恢复默认
          </button>
          <button type="button" className="cover-modal-cancel" onClick={onCancel}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

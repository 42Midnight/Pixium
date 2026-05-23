import { useState, useCallback, useEffect, useRef } from 'react';

interface ImageDimensions {
  width: number;
  height: number;
}

interface UseCoverAdjustOptions {
  initialPosition?: number;
  imageUrl: string | null;
}

export function useCoverAdjust({ initialPosition = 50, imageUrl }: UseCoverAdjustOptions) {
  const [coverPosition, setCoverPosition] = useState(initialPosition);
  const [originalPosition, setOriginalPosition] = useState(initialPosition);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions>({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const hasDraggedRef = useRef(false);

  // Reset when image changes
  const prevImageRef = useRef(imageUrl);
  useEffect(() => {
    if (imageUrl && imageUrl !== prevImageRef.current) {
      setCoverPosition(50);
      setOriginalPosition(50);
      prevImageRef.current = imageUrl;
    }
  }, [imageUrl]);

  const openModal = useCallback(() => {
    setOriginalPosition(coverPosition);
    setIsAdjusting(true);
    hasDraggedRef.current = false;
  }, [coverPosition]);

  const closeModal = useCallback(() => {
    setCoverPosition(originalPosition);
    setIsAdjusting(false);
    setIsDragging(false);
    hasDraggedRef.current = false;
  }, [originalPosition]);

  const confirm = useCallback(() => {
    setIsAdjusting(false);
    setIsDragging(false);
    hasDraggedRef.current = false;
  }, []);

  const reset = useCallback(() => {
    setCoverPosition(50);
    setIsDragging(false);
    hasDraggedRef.current = false;
  }, []);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStartX(e.clientX);
      setDragStartY(e.clientY);
      hasDraggedRef.current = false;
    }
  }, []);

  // Global mouse handlers for smooth dragging
  useEffect(() => {
    if (!isAdjusting) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const { width, height } = imageDimensions;
      if (width <= 0 || height <= 0) return;

      const isHorizontal = width > height;
      const delta = isHorizontal ? e.clientX - dragStartX : e.clientY - dragStartY;
      if (isHorizontal) setDragStartX(e.clientX);
      else setDragStartY(e.clientY);

      const sensitivity = 0.5;
      let newPosition = coverPosition + delta * sensitivity;
      newPosition = Math.max(0, Math.min(100, newPosition));
      setCoverPosition(newPosition);

      if (Math.abs(delta) > 5) {
        hasDraggedRef.current = true;
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isAdjusting, isDragging, dragStartX, dragStartY, coverPosition, imageDimensions]);

  return {
    coverPosition,
    setCoverPosition,
    isAdjusting,
    imageDimensions,
    isDragging,
    hasDragged: hasDraggedRef,
    openModal,
    closeModal,
    confirm,
    reset,
    handleImageLoad,
    handleDragStart,
  };
}

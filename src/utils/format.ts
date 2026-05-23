import type { DateInfo } from '../types';

export function formatDate(createdAt: DateInfo | undefined): string {
  if (!createdAt) return '';
  return `${createdAt.year}年${createdAt.month}月${createdAt.day}日`;
}

export function isSameDay(a: DateInfo | undefined, b: DateInfo | undefined): boolean {
  if (!a || !b) return false;
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function getCoverBackgroundPosition(
  coverPosition: number,
  dimensions: { width: number; height: number }
): string {
  if (dimensions.width === 0 || dimensions.height === 0) return 'center';
  if (dimensions.width > dimensions.height) {
    return `${coverPosition}% 50%`;
  }
  return `50% ${coverPosition}%`;
}

export function getCoverImageTransform(
  coverPosition: number,
  dimensions: { width: number; height: number },
  cropSize = 300
): string {
  const { width, height } = dimensions;
  if (width === 0 || height === 0) {
    return 'translate(-50%, -50%) scale(1)';
  }
  if (width > height) {
    const scale = cropSize / height;
    const scaledWidth = width * scale;
    const maxOffset = (scaledWidth - cropSize) / 2;
    const offset = ((50 - coverPosition) / 50) * maxOffset;
    return `translate(calc(-50% + ${offset}px), -50%) scale(${scale})`;
  }
  const scale = cropSize / width;
  const scaledHeight = height * scale;
  const maxOffset = (scaledHeight - cropSize) / 2;
  const offset = ((50 - coverPosition) / 50) * maxOffset;
  return `translate(-50%, calc(-50% + ${offset}px)) scale(${scale})`;
}

export function getNow(): DateInfo {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: now.getSeconds(),
    timestamp: Date.now(),
  };
}

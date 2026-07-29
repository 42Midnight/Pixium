import { memo, useRef, useState, useEffect } from 'react';
import type { WorkData } from '../../types';
import styles from './Waterfall.module.css';

interface WorkCardProps {
  work: WorkData;
  position?: { left: string; top: string; width: string };
  isSelected: boolean;
  isBatchMode: boolean;
  useAbsolutePosition?: boolean;
  className?: string;
  onClick: (e: React.MouseEvent, work: WorkData) => void;
  onContextMenu: (e: React.MouseEvent, work: WorkData) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent, work: WorkData) => void;
}

export default memo(function WorkCard({
  work, position, isSelected, isBatchMode, useAbsolutePosition = true,
  className = '',
  onClick, onContextMenu,
  isFavorite = false,
  onToggleFavorite,
}: WorkCardProps) {
  const backgroundPosition = work.coverPosition !== undefined
    ? (work.coverPositionVertical ? `50% ${work.coverPosition}%` : `${work.coverPosition}% 50%`)
    : 'center';

  const maskId = `gap-mask-${work.id.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`${styles.workCard} ${isBatchMode ? styles.batchMode : ''} ${isSelected ? styles.selected : ''} ${className}`}
      style={useAbsolutePosition && position ? { left: position.left, top: position.top, width: position.width } : undefined}
      onClick={e => onClick(e, work)}
      onContextMenu={e => onContextMenu(e, work)}
    >
      <div className={`${styles.workCover} ${isSelected ? styles.selected : ''}`}>
        {isBatchMode && (
          <div className={styles.selectCheckbox}>
            <div className={`${styles.checkboxInner} ${isSelected ? styles.checked : ''}`}>
              {isSelected && <span className={styles.checkmark}>✓</span>}
            </div>
          </div>
        )}
        {work.images && work.images.length > 1 && (
          <div className={styles.imageCount}>
            <svg width="12" height="12" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <mask id={maskId}>
                  <rect width="100%" height="100%" fill="white"/>
                  <rect x="24" y="24" width="162" height="162" rx="42" fill="black"/>
                </mask>
              </defs>
              <rect x="86" y="86" width="130" height="130" rx="26" fill="currentColor" mask={`url(#${maskId})`}/>
              <rect x="40" y="40" width="130" height="130" rx="26" fill="currentColor"/>
            </svg>

            <span>{work.images.length}</span>
          </div>
        )}
        <button
          className={`${styles.favoriteHeartBtn} ${isFavorite ? styles.favorited : ''}`}
          onClick={e => {
            e.stopPropagation();
            onToggleFavorite?.(e, work);
          }}
          title={isFavorite ? '取消喜欢' : '喜欢'}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isFavorite ? '#ff4081' : '#fff'} stroke="#000" strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <div
          className={styles.coverImageContainer}
          style={isVisible ? { backgroundImage: `url(${work.cover})`, backgroundSize: 'cover', backgroundPosition } : undefined}
        />
      </div>
      <div className={styles.workInfo}>
        <p className={styles.workTitle}>{work.title}</p>
      </div>
    </div>
  );
});

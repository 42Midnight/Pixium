import type { Collection } from '../../types';
import styles from './Waterfall.module.css';

interface CollectionCardProps {
  collection: Collection;
  index: number;
  position: { left: string; top: string; width: string };
  isSelected: boolean;
  isBatchMode: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  coverUrl: string | null;
  coverPosition?: number;
  coverPositionVertical?: boolean;
  workCount: number;
  onClick: (e: React.MouseEvent, collection: Collection) => void;
  onContextMenu: (e: React.MouseEvent, collection: Collection) => void;
  onDragStart: (e: React.DragEvent, collection: Collection) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export default function CollectionCard({
  collection, index, position, isSelected, isBatchMode, isDragging, isDragOver,
  coverUrl, coverPosition, coverPositionVertical, workCount,
  onClick, onContextMenu, onDragStart, onDragOver, onDrop, onDragEnd,
}: CollectionCardProps) {
  const backgroundPosition = coverPosition !== undefined
    ? (coverPositionVertical ? `50% ${coverPosition}%` : `${coverPosition}% 50%`)
    : 'center';

  return (
    <div
      className={`${styles.workCard} ${isBatchMode ? styles.batchMode : ''} ${isSelected ? styles.selected : ''} ${isDragging ? styles.dragging : ''} ${isDragOver ? styles.dragOver : ''}`}
      style={{ left: position.left, top: position.top, width: position.width }}
      onClick={e => onClick(e, collection)}
      onContextMenu={e => onContextMenu(e, collection)}
      draggable={!isBatchMode}
      onDragStart={e => onDragStart(e, collection)}
      onDragOver={e => onDragOver(e, index)}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className={`${styles.workCover} ${isSelected ? styles.selected : ''}`}>
        {isBatchMode && (
          <div className={styles.selectCheckbox}>
            <div className={`${styles.checkboxInner} ${isSelected ? styles.checked : ''}`}>
              {isSelected && <span className={styles.checkmark}>✓</span>}
            </div>
          </div>
        )}
        {coverUrl ? (
          <div className={styles.coverImageContainer} style={{ backgroundImage: `url(${coverUrl})`, backgroundSize: 'cover', backgroundPosition }} />
        ) : (
          <div className={styles.noCover}>暂无封面</div>
        )}
      </div>
      <div className={styles.workInfo}>
        <p className={styles.workTitle}>{collection.name}</p>
        <p className={styles.workCount}>{workCount} 个作品</p>
      </div>
    </div>
  );
}

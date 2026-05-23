import type { Collection } from '../../types';

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
      className={`work-card ${isBatchMode ? 'batch-mode' : ''} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
      style={{ left: position.left, top: position.top, width: position.width }}
      onClick={e => onClick(e, collection)}
      onContextMenu={e => onContextMenu(e, collection)}
      draggable={!isBatchMode}
      onDragStart={e => onDragStart(e, collection)}
      onDragOver={e => onDragOver(e, index)}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className={`work-cover ${isSelected ? 'selected' : ''}`}>
        {isBatchMode && (
          <div className="select-checkbox">
            <div className={`checkbox-inner ${isSelected ? 'checked' : ''}`}>
              {isSelected && <span className="checkmark">✓</span>}
            </div>
          </div>
        )}
        {coverUrl ? (
          <div className="cover-image-container" style={{ backgroundImage: `url(${coverUrl})`, backgroundSize: 'cover', backgroundPosition }} />
        ) : (
          <div className="no-cover">暂无封面</div>
        )}
      </div>
      <div className="work-info">
        <p className="work-title">{collection.name}</p>
        <p className="work-count">{workCount} 个作品</p>
      </div>
    </div>
  );
}

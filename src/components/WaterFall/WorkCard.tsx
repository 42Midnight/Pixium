import type { WorkData } from '../../types';

interface WorkCardProps {
  work: WorkData;
  position?: { left: string; top: string; width: string };
  isSelected: boolean;
  isBatchMode: boolean;
  useAbsolutePosition?: boolean;
  onClick: (e: React.MouseEvent, work: WorkData) => void;
  onContextMenu: (e: React.MouseEvent, work: WorkData) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent, work: WorkData) => void;
}

export default function WorkCard({
  work, position, isSelected, isBatchMode, useAbsolutePosition = true,
  onClick, onContextMenu,
  isFavorite = false,
  onToggleFavorite,
}: WorkCardProps) {
  const backgroundPosition = work.coverPosition !== undefined
    ? (work.coverPositionVertical ? `50% ${work.coverPosition}%` : `${work.coverPosition}% 50%`)
    : 'center';

  return (
    <div
      className={`work-card ${isBatchMode ? 'batch-mode' : ''} ${isSelected ? 'selected' : ''}`}
      style={useAbsolutePosition && position ? { left: position.left, top: position.top, width: position.width } : undefined}
      onClick={e => onClick(e, work)}
      onContextMenu={e => onContextMenu(e, work)}
    >
      <div className={`work-cover ${isSelected ? 'selected' : ''}`}>
        {isBatchMode && (
          <div className="select-checkbox">
            <div className={`checkbox-inner ${isSelected ? 'checked' : ''}`}>
              {isSelected && <span className="checkmark">✓</span>}
            </div>
          </div>
        )}
        {work.images && work.images.length > 1 && (
          <div className="image-count">
            <svg width="12" height="12" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <mask id="gap-mask">
                  <rect width="100%" height="100%" fill="white"/>
                  <rect x="24" y="24" width="162" height="162" rx="42" fill="black"/>
                </mask>
              </defs>
              <rect x="86" y="86" width="130" height="130" rx="26" fill="currentColor" mask="url(#gap-mask)"/>
              <rect x="40" y="40" width="130" height="130" rx="26" fill="currentColor"/>
            </svg>

            <span>{work.images.length}</span>
          </div>
        )}
        <button
          className={`favorite-heart-btn ${isFavorite ? 'favorited' : ''}`}
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
        <div className="cover-image-container" style={{ backgroundImage: `url(${work.cover})`, backgroundSize: 'cover', backgroundPosition }} />
      </div>
      <div className="work-info">
        <p className="work-title">{work.title}</p>
      </div>
    </div>
  );
}

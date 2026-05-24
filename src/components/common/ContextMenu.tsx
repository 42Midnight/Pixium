import { useEffect, useRef } from 'react';
import './common.css';

interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    const handleGlobalClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <>
      <div className="context-menu-overlay" onClick={onClose} />
      <div ref={menuRef} className="context-menu" style={{ left: x, top: y, position: 'fixed', zIndex: 1000 }}>
        {items.map((item, index) => (
          <div
            key={index}
            className={`context-menu-item${item.danger ? ' danger' : ''}`}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </>
  );
}

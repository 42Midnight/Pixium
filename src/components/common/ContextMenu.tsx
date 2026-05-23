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
    // 阻止鼠标滚轮事件
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    // 全局点击事件处理
    const handleGlobalClick = (e: MouseEvent) => {
      // 如果点击的不是菜单本身，则关闭菜单
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // 添加事件监听
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('click', handleGlobalClick);

    // 清理函数：移除事件监听
    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('click', handleGlobalClick);
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

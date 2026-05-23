import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isElectronAvailable } from '../../services/electron';

interface TitleBarProps {
  title?: string;
  onBack?: () => void;
}

export default function TitleBar({ title, onBack }: TitleBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isElectronAvailable()) return;
    window.electronAPI!.getAlwaysOnTop().then(r => { if (r.success) setAlwaysOnTop(r.alwaysOnTop); });
    window.electronAPI!.winIsMaximized().then(r => setIsMaximized(r.maximized));
    const removeListener = window.electronAPI!.onWindowStateChanged(data => {
      setIsMaximized(data.maximized);
    });
    return () => { removeListener?.(); };
  }, []);

  const handleTogglePin = useCallback(async () => {
    if (!isElectronAvailable()) return;
    const r = await window.electronAPI!.toggleAlwaysOnTop();
    if (r.success) setAlwaysOnTop(r.alwaysOnTop);
  }, []);

  const handleMinimize = () => window.electronAPI?.winMinimize();
  const handleMaximize = async () => {
    await window.electronAPI?.winMaximize();
    if (isElectronAvailable()) {
      const r = await window.electronAPI!.winIsMaximized();
      setIsMaximized(r.maximized);
    }
  };
  const handleClose = () => window.electronAPI?.winClose();

  return (
    <div className="titlebar-drag" style={{ display: 'flex', alignItems: 'center', padding: '0 16px', WebkitAppRegion: 'drag', backgroundColor: 'rgba(51, 51, 51, 1)', height: '60px' } as React.CSSProperties}>
      {/* Left: back button */}
      <div style={{ WebkitAppRegion: 'no-drag', width: 40, flexShrink: 0 } as React.CSSProperties}>
        {onBack && (
          <button className="win-ctrl-btn" onClick={onBack} title="返回">
            <svg width="24" height="24" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}
      </div>

      {/* Center: title */}
      <div className="titlebar-title" style={{ flex: 1, height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255, 255, 255, 1)', fontWeight: '700', fontSize: '18px', whiteSpace: 'nowrap' } as React.CSSProperties}>
          {title || ''}
        </span>
      </div>

      {/* Right: pin, settings, min, max, close */}
      <div style={{ WebkitAppRegion: 'no-drag', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 } as React.CSSProperties}>
        <button className={`pin-button ${alwaysOnTop ? 'active' : ''}`} onClick={handleTogglePin} title={alwaysOnTop ? '取消置顶' : '窗口置顶'}>
          <svg width="14" height="14" viewBox="0 0 14 16" fill="none" stroke={alwaysOnTop ? '#4caf50' : '#fff'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 1 L11 1 L8.5 5 L12 10 L2 10 L5.5 5 L3 1 M7 10 L7 15"/></svg>
        </button>
        <button className="win-ctrl-btn" onClick={() => { if (location.pathname !== '/favorites') navigate('/favorites', { state: { previousPath: location.pathname, previousState: location.state } }); }} title="喜欢">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <button className="win-ctrl-btn" onClick={() => { if (location.pathname !== '/settings') navigate('/settings', { state: { previousPath: location.pathname, previousState: location.state } }); }} title="设置">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
        <button className="win-ctrl-btn" onClick={handleMinimize} title="最小化">
          <svg width="14" height="14"><line x1="2" y1="7" x2="12" y2="7" stroke="#fff" strokeWidth="1.2"/></svg>
        </button>
        <button className="win-ctrl-btn" onClick={handleMaximize} title="最大化">
          {isMaximized
            ? <svg width="14" height="14"><rect x="2" y="5" width="7" height="7" fill="none" stroke="#fff" strokeWidth="1.2"/><rect x="5" y="2" width="7" height="7" fill="none" stroke="#fff" strokeWidth="1.2"/></svg>
            : <svg width="14" height="14"><rect x="2" y="2" width="10" height="10" fill="none" stroke="#fff" strokeWidth="1.2"/></svg>
          }
        </button>
        <button className="win-ctrl-btn win-close-btn" onClick={handleClose} title="关闭">
          <svg width="14" height="14"><line x1="3" y1="3" x2="11" y2="11" stroke="#fff" strokeWidth="1.3"/><line x1="11" y1="3" x2="3" y2="11" stroke="#fff" strokeWidth="1.3"/></svg>
        </button>
      </div>
    </div>
  );
}

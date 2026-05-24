import { useEffect } from 'react';
import './common.css';

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  children?: React.ReactNode;
}

export default function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
  loading = false,
  children,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <h3 className="dialog-title">{title}</h3>
        <p className="dialog-message">{message}</p>
        {children}
        <div className="dialog-buttons">
          <button
            className="dialog-btn dialog-btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className="dialog-btn dialog-btn-confirm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

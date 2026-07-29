import { useEffect } from 'react';
import styles from './common.module.css';

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
    <div className={styles.dialogOverlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <h3 className={styles.dialogTitle}>{title}</h3>
        <p className={styles.dialogMessage}>{message}</p>
        {children}
        <div className={styles.dialogButtons}>
          <button
            className={`${styles.dialogBtn} ${styles.dialogBtnCancel}`}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className={`${styles.dialogBtn} ${styles.dialogBtnConfirm}`}
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

import { useState, useCallback } from 'react';
import { isElectronAvailable } from '../../services/electron';
import styles from './Settings.module.css';

export default function ImportExport() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const handleExport = useCallback(async () => {
    if (!isElectronAvailable()) return;
    setExporting(true);
    try {
      const folder = await window.electronAPI!.selectFolder();
      if (!folder.success || !folder.path) { setExporting(false); return; }

      const dateStr = new Date().toISOString().slice(0, 10);
      const exportPath = `${folder.path}/Pixium_Export_${dateStr}`;

      const result = await window.electronAPI!.exportData(exportPath);
      if (result.success) {
        showMsg('success', `数据已导出到：${exportPath}`);
      } else {
        showMsg('error', `导出失败：${result.error}`);
      }
    } catch (e: any) {
      showMsg('error', `导出失败：${e.message}`);
    } finally {
      setExporting(false);
    }
  }, [showMsg]);

  const handleImport = useCallback(async () => {
    if (!isElectronAvailable()) return;
    if (!confirm('导入数据将覆盖现有作品数据，确定要继续吗？')) return;

    setImporting(true);
    try {
      const folder = await window.electronAPI!.selectFolder();
      if (!folder.success || !folder.path) { setImporting(false); return; }

      const result = await window.electronAPI!.importData(folder.path);
      if (result.success) {
        showMsg('success', '数据已成功导入，请重启应用以刷新数据');
      } else {
        showMsg('error', `导入失败：${result.error}`);
      }
    } catch (e: any) {
      showMsg('error', `导入失败：${e.message}`);
    } finally {
      setImporting(false);
    }
  }, [showMsg]);

  return (
    <div className={styles.settingsSection}>
      <h3 className={styles.sectionTitle}>导入导出</h3>

      <div className={styles.importExportSection}>
        <div className={styles.importExportCard}>
          <div className={styles.importExportInfo}>
            <h4>导出数据</h4>
            <p>将所有作品数据（图片和元数据）导出到指定文件夹。导出内容包括 image 目录和 collections.json。</p>
          </div>
          <button className={styles.importExportBtn} onClick={handleExport} disabled={exporting}>
            {exporting ? '导出中...' : '导出数据'}
          </button>
        </div>

        <div className={styles.importExportCard}>
          <div className={styles.importExportInfo}>
            <h4>导入数据</h4>
            <p>从之前导出的文件夹中恢复数据。导入会合并到现有数据中，同名文件将被覆盖。</p>
          </div>
          <button className={`${styles.importExportBtn} ${styles.importBtn}`} onClick={handleImport} disabled={importing}>
            {importing ? '导入中...' : '导入数据'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`${styles.importExportMessage} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

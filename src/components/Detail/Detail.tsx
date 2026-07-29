import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { isElectronAvailable } from '../../services/electron';
import { useSettings } from '../../hooks/useSettings';
import { useFavorites } from '../../hooks/useFavorites';
import TitleBar from '../common/TitleBar';
import ConfirmDialog from '../common/ConfirmDialog';
import ImageViewer from './ImageViewer';
import PromptCard from './PromptCard';
import { tagColor } from '../common/TagInput';
import type { WorkData } from '../../types';
import styles from './Detail.module.css';

export default function Detail() {
  const { fileName } = useParams<{ fileName: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const { isFavorite, toggleFavorite, removeFavorites } = useFavorites();

  const [workData, setWorkData] = useState<WorkData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSelected, setCopiedSelected] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const collectionFolder = location.state?.collectionFolder as string | undefined;
  const previousPath = location.state?.previousPath as string | undefined;

  const goBack = useCallback(() => {
    if (previousPath) {
      navigate(previousPath);
    } else if (collectionFolder) {
      navigate(`/${collectionFolder}`);
    } else {
      navigate('/');
    }
  }, [previousPath, collectionFolder, navigate]);

  useEffect(() => {
    if (!fileName) return;
    const decodedFileName = decodeURIComponent(fileName);

    const loadWorkData = async () => {
      if (!isElectronAvailable()) return;
      try {
        const result = await window.electronAPI!.readWorkDetail(decodedFileName);
        if (result.success && result.workData) {
          setWorkData(result.workData);
        } else {
          alert('加载作品详情失败: ' + (result.error || ''));
          goBack();
        }
      } catch (error: any) {
        alert('加载作品详情失败: ' + error.message);
        goBack();
      }
    };
    loadWorkData();
  }, [fileName, location.state, goBack]);

  const handleCopy = useCallback(async (fieldName: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handleCopyAll = useCallback(async () => {
    if (!workData?.prompt) return;
    await navigator.clipboard.writeText(Object.values(workData.prompt).join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }, [workData]);

  const handleCopySelected = useCallback(async () => {
    if (!workData?.prompt || !selectedFields.length) return;
    const values = selectedFields.map(f => workData.prompt![f]).join('\n');
    await navigator.clipboard.writeText(values);
    setCopiedSelected(true);
    setIsMultiSelectMode(false);
    setSelectedFields([]);
    setTimeout(() => setCopiedSelected(false), 2000);
  }, [workData, selectedFields]);

  const handleToggleSelect = useCallback((fieldName: string) => {
    setSelectedFields(prev => prev.includes(fieldName) ? prev.filter(f => f !== fieldName) : [...prev, fieldName]);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!workData) return;
    setIsDeleting(true);
    try {
      const deleteId = workData.id;
      if (isElectronAvailable() && deleteId) {
        await window.electronAPI!.deleteFiles(deleteId);
        const collResult = await window.electronAPI!.readCollections();
        if (collResult.success) {
          const updated = (collResult.data.collections || []).map(c => ({
            ...c,
            images: c.images?.filter((id: string) => id !== deleteId) || [],
          }));
          await window.electronAPI!.saveCollections({ collections: updated });
        }
      }
      removeFavorites([workData.id, workData.folder].filter(Boolean) as string[]);
      goBack();
    } catch (error: any) {
      alert('删除失败：' + error.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [workData, goBack, removeFavorites]);

  const handleSaveAs = useCallback(async () => {
    if (!workData?.fileName || !isElectronAvailable()) return;
    const selectResult = await window.electronAPI!.selectFolder();
    if (!selectResult.success || !selectResult.path) return;
    const folderPath = workData.fileName.includes('/') ? workData.fileName.substring(0, workData.fileName.lastIndexOf('/')) : '';
    if (!folderPath) { alert('无法确定图片所在文件夹'); return; }
    const result = await window.electronAPI!.downloadImage(folderPath, selectResult.path);
    if (result.success) alert(`成功保存 ${result.count} 张图片到: ${selectResult.path}`);
    else alert('保存失败: ' + result.error);
  }, [workData]);

  const handleDownload = useCallback(async () => {
    if (!workData?.fileName) return;
    if (!settings.downloadPath) { alert('请先在设置中配置下载位置'); return; }
    setIsDownloading(true);
    try {
      const folderPath = workData.fileName.includes('/') ? workData.fileName.substring(0, workData.fileName.lastIndexOf('/')) : '';
      if (!folderPath) { alert('无法确定图片所在文件夹'); return; }
      if (isElectronAvailable()) {
        const result = await window.electronAPI!.downloadImage(folderPath, settings.downloadPath);
        if (result.success) alert(`成功下载 ${result.count || 1} 张图片到：${result.path}`);
        else alert('下载失败：' + result.error);
      }
    } finally {
      setIsDownloading(false);
    }
  }, [workData, settings.downloadPath]);

  if (!workData) {
    return <div className={styles.detailLoading}><p>加载中...</p></div>;
  }

  const hasPrompt = workData.prompt && Object.keys(workData.prompt).length > 0;

  return (
    <div className={styles.detailContainer}>
      <TitleBar title={workData.title} onBack={goBack} />
      <div className={styles.detailHeaderFixed}>

      {/* Row 2: edit + copy controls right-aligned */}
      <div className={styles.detailSubbar}>
        <button
          className={`${styles.detailFavBtn} ${isFavorite(workData.id) ? styles.favorited : ''}`}
          onClick={() => toggleFavorite(workData.id)}
          title={isFavorite(workData.id) ? '取消喜欢' : '喜欢'}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isFavorite(workData.id) ? '#ff4081' : '#fff'} stroke="#000" strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <button
          onClick={() => navigate('/upload', { state: { editMode: true, workData, collectionId: location.state?.collectionId, collectionFolder, previousPath } })}>
          编辑
        </button>
        {hasPrompt && (
          <>
            {copiedSelected ? (
              <button className={`${styles.copySelectedButton} ${styles.copied}`}>已复制选中</button>
            ) : isMultiSelectMode ? (
              selectedFields.length > 0 ? (
                <button className={styles.copySelectedButton} onClick={handleCopySelected}>复制选中 ({selectedFields.length})</button>
              ) : (
                <button className={styles.copySelectedButton} onClick={() => setIsMultiSelectMode(false)}>取消多选</button>
              )
            ) : (
              <button className={styles.copySelectedButton} onClick={() => setIsMultiSelectMode(true)}>多选</button>
            )}
            <button className={`${styles.copyAllButton} ${copiedAll ? styles.copied : ''}`} onClick={handleCopyAll}>
              {copiedAll ? '已复制全部' : '复制全部'}
            </button>
          </>
        )}
      </div>
      </div>

      <div className={styles.detailContent}>
        <div className={styles.detailLeft}>
          <ImageViewer
            images={workData.images}
            title={workData.title}
            folder={workData.folder}
            coverUrl={workData.cover}
            downloadPath={settings.downloadPath}
            showFilename={settings.showImageFilename}
          />
          {!hasPrompt && workData.tags && workData.tags.length > 0 && (
            <div className={styles.detailTagsRow}>
              {workData.tags.map(tag => (
                <span key={tag} className={styles.detailTagPill} style={{ backgroundColor: tagColor(tag) }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className={styles.detailInfo}>
            <button className={styles.saveasButton} onClick={handleSaveAs}>另存为</button>
            <button className={styles.downloadButton} onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? '下载中...' : '下载图片'}
            </button>
            <button className={styles.deleteButton} onClick={() => setShowDeleteConfirm(true)}>删除作品</button>
          </div>
        </div>

        {hasPrompt && (
          <div className={styles.detailRight}>
            {workData.tags && workData.tags.length > 0 && (
              <div className={styles.detailTagsRow}>
                {workData.tags.map(tag => (
                  <span key={tag} className={styles.detailTagPill} style={{ backgroundColor: tagColor(tag) }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className={styles.promptList}>
              {Object.entries(workData.prompt!).map(([fieldName, fieldValue]) => (
                <PromptCard
                  key={fieldName}
                  fieldName={fieldName}
                  fieldValue={fieldValue}
                  isSelected={selectedFields.includes(fieldName)}
                  isMultiSelectMode={isMultiSelectMode}
                  onToggleSelect={handleToggleSelect}
                  onCopy={handleCopy}
                  copiedField={copiedField}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog title="确认删除" message="确定要删除这个作品吗？此操作不可恢复！"
          onConfirm={handleConfirmDelete} onCancel={() => setShowDeleteConfirm(false)} loading={isDeleting} confirmText="确认删除" />
      )}
    </div>
  );
}

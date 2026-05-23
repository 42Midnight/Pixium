import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWorks } from '../../hooks/useWorks';
import { useFavorites } from '../../hooks/useFavorites';
import { useSettings } from '../../hooks/useSettings';
import { isElectronAvailable } from '../../services/electron';
import TitleBar from '../common/TitleBar';
import ContextMenu from '../common/ContextMenu';
import WorkCard from '../WaterFall/WorkCard';
import type { WorkData } from '../../types';
import './Favorites.css';

export default function Favorites() {
  const navigate = useNavigate();
  const location = useLocation();
  const { works, loadWorks } = useWorks();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { settings } = useSettings();
  const [workContextMenu, setWorkContextMenu] = useState<{ x: number; y: number; work: WorkData } | null>(null);

  const goBack = () => {
    const previousPath = location.state?.previousPath || '/';
    navigate(previousPath);
  };

  const favoriteWorks: WorkData[] = (settings.favoritesSortOrder === 'oldest'
    ? [...favorites].reverse()
    : favorites
  )
    .map(id => works.find(w => w.id === id))
    .filter((w): w is WorkData => w != null);

  const handleToggleFavorite = (_e: React.MouseEvent, work: WorkData) => {
    toggleFavorite(work.id);
  };

  const handleCardClick = (_e: React.MouseEvent, work: WorkData) => {
    const collectionFolder = work.folder?.split('/')[0];
    navigate(`/detail/${encodeURIComponent(work.fileName)}`, {
      state: { previousPath: '/favorites', collectionFolder, collectionId: work.collectionId },
    });
  };

  return (
    <div className="favorites-page">
      <TitleBar title="喜欢" onBack={goBack} />
      <div className="favorites-container">
        {favoriteWorks.length === 0 ? (
          <div className="favorites-empty">
            <p>还没有喜欢任何作品</p>
            <p className="favorites-empty-hint">在作品卡片上点击心形图标即可喜欢</p>
          </div>
        ) : (
          <div className="favorites-grid">
            {favoriteWorks.map(work => (
              <WorkCard
                key={work.id}
                work={work}
                isSelected={false}
                isBatchMode={false}
                useAbsolutePosition={false}
                onClick={handleCardClick}
                onContextMenu={(e, w) => { e.preventDefault(); e.stopPropagation(); setWorkContextMenu({ x: e.clientX, y: e.clientY, work: w }); }}
                isFavorite={isFavorite(work.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>

      {workContextMenu && (
        <ContextMenu x={workContextMenu.x} y={workContextMenu.y} items={[
          { label: '编辑', onClick: () => {
            const w = workContextMenu.work;
            const collectionFolder = w.folder?.split('/')[0];
            navigate('/upload', { state: { editMode: true, workData: w, collectionFolder, previousPath: '/favorites' } });
          }},
          { label: '下载', onClick: async () => {
            const w = workContextMenu.work;
            const dlPath = settings.downloadPath;
            if (!dlPath) { alert('请先在设置中配置下载路径'); return; }
            if (!isElectronAvailable()) return;
            const result = await window.electronAPI!.downloadImage(w.id, dlPath);
            if (result.success) alert(`已下载 ${result.count} 张图片`);
            else alert('下载失败: ' + result.error);
          }},
          { label: '另存为', onClick: async () => {
            const w = workContextMenu.work;
            if (!isElectronAvailable()) return;
            const selectResult = await window.electronAPI!.selectFolder();
            if (!selectResult.success || !selectResult.path) return;
            const result = await window.electronAPI!.downloadImage(w.id, selectResult.path);
            if (result.success) alert(`已保存 ${result.count} 张图片到 ${selectResult.path}`);
            else alert('保存失败: ' + result.error);
          }},
          { label: '删除', onClick: async () => {
            const w = workContextMenu.work;
            if (!confirm(`确定要删除作品"${w.title || w.id}"吗？`)) return;
            if (isElectronAvailable()) {
              await window.electronAPI!.deleteFiles(w.id);
              toggleFavorite(w.id);
              await loadWorks();
            }
          }, danger: true },
        ]} onClose={() => setWorkContextMenu(null)} />
      )}
    </div>
  );
}

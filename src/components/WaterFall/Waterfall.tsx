import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useCollections } from '../../hooks/useCollections';
import { useWorks } from '../../hooks/useWorks';
import { useSettings } from '../../hooks/useSettings';
import { useFavorites } from '../../hooks/useFavorites';
import { isElectronAvailable } from '../../services/electron';
import { formatDate, isSameDay } from '../../utils/format';
import TitleBar from '../common/TitleBar';
import ConfirmDialog from '../common/ConfirmDialog';
import ContextMenu from '../common/ContextMenu';
import CollectionCard from './CollectionCard';
import WorkCard from './WorkCard';
import type { Collection, WorkData } from '../../types';
import './Waterfall.css';

interface CardPosition {
  left: string;
  top: string;
  width: string;
}

export default function WaterFall() {
  const navigate = useNavigate();
  const location = useLocation();
  const { folderName } = useParams<{ folderName?: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const { collections, isLoading: collsLoading, setCollections, loadCollections, saveCollections } = useCollections();
  const { works, isLoading: worksLoading, loadWorks, getCollectionWorks } = useWorks();
  const { settings } = useSettings();
  const { toggleFavorite, isFavorite } = useFavorites();
  const isLoading = collsLoading || worksLoading;

  // Scroll ref (used later by effects)
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const saveScroll = useCallback(() => {
    scrollPositionsRef.current[location.pathname] = window.scrollY;
  }, [location.pathname]);

  const activeCollection = useMemo(
    () => (folderName ? collections.find(c => c.folder === folderName) || null : null),
    [folderName, collections],
  );

  const [columns, setColumns] = useState<number[]>([]);
  const [columnCount, setColumnCount] = useState(6);
  const [cardPositions, setCardPositions] = useState<Record<string, CardPosition>>({});
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Reset layout ready flag and search on path change
  useEffect(() => { layoutReadyRef.current = false; setInputQuery(''); setSubmittedQuery(''); }, [location.pathname]);
  useEffect(() => {
    if (Object.keys(cardPositions).length > 0 && !layoutReadyRef.current) {
      layoutReadyRef.current = true;
      const restored = scrollPositionsRef.current[location.pathname] || 0;
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, restored)));
    }
  }, [cardPositions, location.pathname]);
  const [selectedWorks, setSelectedWorks] = useState<(WorkData | Collection)[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveConfirm, setShowMoveConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'move' | 'copy' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTargetCollection, setSelectedTargetCollection] = useState<Collection | null>(null);
  const [singleWorkAction, setSingleWorkAction] = useState<WorkData | null>(null);

  const [collectionContextMenu, setCollectionContextMenu] = useState<{ x: number; y: number; collection: Collection } | null>(null);
  const [workContextMenu, setWorkContextMenu] = useState<{ x: number; y: number; work: WorkData } | null>(null);

  const [draggingCollection, setDraggingCollection] = useState<Collection | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState(-1);
  const layoutReadyRef = useRef(false);

  const displayCollections = useMemo(() => {
    if (!draggingCollection || dragOverIndex === -1) return collections;
    const newArr = [...collections];
    const removeIndex = newArr.findIndex(c => c.id === draggingCollection.id);
    if (removeIndex === -1) return collections;
    const removed = newArr.splice(removeIndex, 1)[0];
    const insertIndex = Math.max(0, Math.min(dragOverIndex, newArr.length));
    newArr.splice(insertIndex, 0, removed);
    return newArr;
  }, [draggingCollection, dragOverIndex, collections]);

  const loadAll = useCallback(async () => {
    await loadCollections();
    await loadWorks();
  }, [loadCollections, loadWorks]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Reset batch mode when navigation changes
  useEffect(() => {
    setIsBatchMode(false);
    setSelectedWorks([]);
  }, [folderName]);

  // Masonry layout
  const calculateColumnCount = useCallback(() => {
    const w = window.innerWidth;
    if (w <= 400) return 1;
    if (w <= 600) return 2;
    if (w <= 900) return 3;
    if (w <= 1200) return 4;
    if (w <= 1400) return 5;
    return 6;
  }, []);

  const getDisplayItems = useCallback((): (WorkData | Collection)[] => {
    if (!activeCollection) return draggingCollection ? displayCollections : collections;
    return getCollectionWorks(activeCollection);
  }, [activeCollection, collections, draggingCollection, displayCollections, getCollectionWorks]);

  const items = useMemo(() => getDisplayItems(), [getDisplayItems]);

  const filteredItems = useMemo(() => {
    if (!submittedQuery.trim()) return items;
    const q = submittedQuery.trim().toLowerCase();
    return items.filter(item => {
      if ('title' in item) {
        return item.title.toLowerCase().includes(q);
      }
      return item.name.toLowerCase().includes(q);
    });
  }, [items, submittedQuery]);

  const calculateCardPositions = useCallback((count: number) => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    const cardWidth = (containerWidth * 0.9) / count;
    const gap = (containerWidth * 0.1) / (count + 1);
    const columnHeights = Array(count).fill(0);
    const positions: Record<string, CardPosition> = {};

    for (const item of filteredItems) {
      const shortest = columnHeights.indexOf(Math.min(...columnHeights));
      const left = gap + shortest * (cardWidth + gap);
      const top = columnHeights[shortest] + 10;
      positions[item.id] = { left: `${left}px`, top: `${top}px`, width: `${cardWidth}px` };
      columnHeights[shortest] = top + cardWidth + 40;
    }
    setCardPositions(positions);
    if (containerRef.current) {
      containerRef.current.style.height = `${Math.max(...columnHeights) + 10}px`;
    }
  }, [filteredItems]);

  const initMasonry = useCallback(() => {
    const count = calculateColumnCount();
    setColumnCount(count);
    setColumns(Array(count).fill(0));
    calculateCardPositions(count);
  }, [calculateColumnCount, calculateCardPositions]);

  useEffect(() => {
    initMasonry();
    window.addEventListener('resize', initMasonry);
    return () => window.removeEventListener('resize', initMasonry);
  }, [initMasonry, collections, works, activeCollection]);

  useEffect(() => {
    if (draggingCollection && !activeCollection) {
      calculateCardPositions(columnCount);
    }
  }, [dragOverIndex, draggingCollection, columnCount, activeCollection, calculateCardPositions]);

  // Collection cover helper
  const getCollectionCover = useCallback((collection: Collection) => {
    if (collection.cover) {
      const expectedPath = `image/collection_covers/${collection.folder}/cover.`;
      if (collection.cover.includes(expectedPath)) {
        return { cover: collection.cover, coverPosition: collection.coverPosition, coverPositionVertical: collection.coverPositionVertical };
      }
    }
    if (collection.images?.length) {
      let latestWork: WorkData | null = null;
      let latestTs = 0;
      for (const imgPath of collection.images) {
        const w = works.find(w => w.id === imgPath || w.folder === imgPath);
        if (w) {
          const ts = w.createdAt?.timestamp || w.timestamp || 0;
          if (ts > latestTs) { latestTs = ts; latestWork = w; }
        }
      }
      if (latestWork) return { cover: latestWork.cover, coverPosition: latestWork.coverPosition };
    }
    return { cover: null, coverPosition: undefined as number | undefined };
  }, [works]);

  const handleBackToCollections = useCallback(() => {
    navigate('/', { replace: true });
  }, [navigate]);

  const handleCardClick = useCallback((e: React.MouseEvent, work: WorkData) => {
    if (isBatchMode) {
      setSelectedWorks(prev => prev.some(w => w.id === work.id) ? prev.filter(w => w.id !== work.id) : [...prev, work]);
      return;
    }
    saveScroll();
    const state = activeCollection ? { collectionFolder: activeCollection.folder, collectionId: activeCollection.id } : undefined;
    navigate(`/detail/${encodeURIComponent(work.fileName)}`, { state });
  }, [isBatchMode, activeCollection, navigate, saveScroll]);

  const handleCollectionClick = useCallback((_e: React.MouseEvent, collection: Collection) => {
    if (isBatchMode) {
      setSelectedWorks(prev => prev.some(w => w.id === collection.id) ? prev.filter(w => w.id !== collection.id) : [...prev, collection]);
    } else {
      navigate(`/${collection.folder}`);
    }
  }, [isBatchMode, navigate]);

  const isAllSelected = useCallback(() => {
    if (!activeCollection) return collections.length > 0 && selectedWorks.length === collections.length;
    const ws = getCollectionWorks(activeCollection);
    return ws.length > 0 && selectedWorks.length === ws.length;
  }, [activeCollection, collections, selectedWorks, getCollectionWorks]);

  const handleSelectAll = useCallback(() => {
    if (isAllSelected()) {
      setSelectedWorks([]);
    } else if (!activeCollection) {
      setSelectedWorks([...collections]);
    } else {
      setSelectedWorks([...getCollectionWorks(activeCollection)]);
    }
  }, [isAllSelected, activeCollection, collections, getCollectionWorks]);

  const handleToggleFavorite = useCallback((_e: React.MouseEvent, work: WorkData) => {
    toggleFavorite(work.id);
  }, [toggleFavorite]);

  // Batch delete
  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const api = window.electronAPI;
      if (!activeCollection) {
        for (const item of selectedWorks) {
          const c = item as Collection;
          if (api) await api.deleteCollection(c.folder);
        }
        const ids = new Set(selectedWorks.map(s => s.id));
        const updated = collections.filter(c => !ids.has(c.id));
        setCollections(updated);
        await saveCollections({ collections: updated });
      } else {
        for (const item of selectedWorks) {
          if (api) await api.deleteFiles((item as WorkData).id);
        }
        const ids = new Set(selectedWorks.map(s => s.id));
        const updatedImages = (activeCollection.images || []).filter(img => !ids.has(img));
        const updated = collections.map(c =>
          c.id === activeCollection.id ? { ...c, images: updatedImages } : c
        );
        setCollections(updated);
        await saveCollections({ collections: updated });
        await loadAll();
      }
      setShowDeleteConfirm(false);
      setIsBatchMode(false);
      setSelectedWorks([]);
    } catch (error: any) {
      alert('删除失败：' + error.message);
    } finally {
      setIsDeleting(false);
    }
  }, [activeCollection, selectedWorks, collections, setCollections, saveCollections, loadAll]);

  // Move works (batch or single)
  const handleConfirmMove = useCallback(async (target: Collection) => {
    if (!activeCollection || !isElectronAvailable()) return;
    const api = window.electronAPI!;
    let success = true;
    const newIds: string[] = [];
    const worksToMove = singleWorkAction ? [singleWorkAction] : selectedWorks;

    for (const item of worksToMove) {
      const w = item as WorkData;
      const result = await api.moveWorkFolder(w.id, target.id);
      if (!result.success) { alert('移动失败: ' + result.error); success = false; break; }
      newIds.push(result.newWorkId || w.id);
    }

    if (!success) { setShowMoveConfirm(false); setSingleWorkAction(null); return; }

    const ids = new Set(worksToMove.map(s => s.id));
    const updated = collections.map(c => {
      if (c.id === activeCollection.id) return { ...c, images: c.images.filter(img => !ids.has(img)) };
      if (c.id === target.id) return { ...c, images: [...c.images, ...newIds] };
      return c;
    });

    setCollections(updated);
    await saveCollections({ collections: updated });
    setShowMoveConfirm(false);
    setSelectedWorks([]);
    setSingleWorkAction(null);
    setIsBatchMode(false);
  }, [activeCollection, singleWorkAction, selectedWorks, collections, setCollections, saveCollections]);

  // Copy works (batch or single)
  const handleConfirmCopy = useCallback(async (target: Collection) => {
    if (!activeCollection || !isElectronAvailable()) return;
    const api = window.electronAPI!;
    const worksToCopy = singleWorkAction ? [singleWorkAction] : selectedWorks;

    for (const item of worksToCopy) {
      const w = item as WorkData;
      const result = await api.copyWorkFolder(w.id, target.id);
      if (!result.success) { alert('复制失败: ' + result.error); return; }
    }

    setShowMoveConfirm(false);
    setSelectedWorks([]);
    setSingleWorkAction(null);
    setIsBatchMode(false);
    await loadAll();
  }, [activeCollection, singleWorkAction, selectedWorks, loadAll]);

  // Collection drag
  const handleCollectionDragStart = useCallback((e: React.DragEvent, coll: Collection) => {
    e.dataTransfer.setData('isInternalDrag', 'true');
    e.dataTransfer.effectAllowed = 'move';
    setDraggingCollection(coll);
    setDragOverIndex(-1);
  }, []);

  const handleCollectionDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggingCollection) setDragOverIndex(index);
  }, [draggingCollection]);

  const handleCollectionDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.getData('isInternalDrag') === 'true' && draggingCollection && dragOverIndex !== -1) {
      setCollections([...displayCollections]);
      if (isElectronAvailable()) {
        await window.electronAPI!.saveCollections({ collections: displayCollections });
      }
    }
    setDragOverIndex(-1);
    setDraggingCollection(null);
  }, [draggingCollection, dragOverIndex, displayCollections, setCollections]);

  // Date grouping
  const getWorksGroupedByDate = useCallback(() => {
    if (!activeCollection) return [];
    const collWorks = getCollectionWorks(activeCollection);
    if (!collWorks.length) return [];

    const sortOrder = settings.workSortOrder;
    const sorted = [...collWorks].sort((a, b) => {
      const da = a.createdAt, db = b.createdAt;
      if (!da || !db) return 0;
      let r = da.year - db.year || da.month - db.month || da.day - db.day;
      return sortOrder === 'asc' ? r : -r;
    });

    const groups: { dateObj: WorkData['createdAt']; dateStr: string; works: WorkData[] }[] = [];
    let currentGroup: typeof groups[0] | null = null;

    for (const w of sorted) {
      if (!currentGroup || !isSameDay(currentGroup.dateObj!, w.createdAt!)) {
        currentGroup = { dateObj: w.createdAt!, dateStr: formatDate(w.createdAt!), works: [w] };
        groups.push(currentGroup);
      } else {
        currentGroup.works.push(w);
      }
    }
    return groups;
  }, [activeCollection, getCollectionWorks, settings.workSortOrder]);

  const suggestions = useMemo(() => {
    if (!inputQuery.trim()) return [];
    const q = inputQuery.trim().toLowerCase();
    return items
      .filter(item => {
        if ('title' in item) {
          return item.title.toLowerCase().includes(q);
        }
        return item.name.toLowerCase().includes(q);
      })
      .slice(0, 8)
      .map(item => 'title' in item ? (item as WorkData).title : (item as Collection).name);
  }, [items, inputQuery]);

  if (isLoading) return <div className="waterfall-page"><div className="loading">加载中...</div></div>;

  return (
    <div className={`waterfall-page ${isBatchMode ? 'batch-mode' : ''}`}>
      <TitleBar title={!activeCollection ? 'Pixium' : activeCollection.name} onBack={activeCollection ? handleBackToCollections : undefined} />

      <div className="navbar-actions-bar">
        <div className="search-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder={!activeCollection ? '搜索相册...' : '搜索作品...'}
            value={inputQuery}
            onChange={e => { setInputQuery(e.target.value); setShowSuggestions(true); }}
            onKeyDown={e => { if (e.key === 'Enter') { setSubmittedQuery(inputQuery); setShowSuggestions(false); } }}
            onFocus={() => { if (inputQuery.trim()) setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {inputQuery.trim() && (
            <button
              className="search-clear-btn"
              onClick={() => { setInputQuery(''); setSubmittedQuery(''); }}
              title="清除搜索"
            >
              <svg width="14" height="14" viewBox="0 0 16 16"><line x1="4" y1="4" x2="12" y2="12" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/><line x1="12" y1="4" x2="4" y2="12" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/></svg>
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions">
              {suggestions.map((name, i) => (
                <div
                  key={i}
                  className="search-suggestion-item"
                  onMouseDown={() => { setInputQuery(name); setSubmittedQuery(name); setShowSuggestions(false); }}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="navbar-actions">
          {!isBatchMode ? (
            <>
              <button className="navbar-batch-btn" onClick={() => setIsBatchMode(true)}>批量选择</button>
              {!activeCollection ? (
                <button className="navbar-add-btn" onClick={() => navigate('/create-collection')}>
                  <span className="add-icon">+</span><span className="add-text">新建相册</span>
                </button>
              ) : (
                <button className="navbar-add-btn" onClick={() => navigate('/upload', { state: { collectionId: activeCollection.id, collectionFolder: activeCollection.folder } })}>
                  <span className="add-icon">+</span><span className="add-text">添加作品</span>
                </button>
              )}
            </>
          ) : (
            <>
              <span className="selected-count">{selectedWorks.length} 个已选</span>
              <button className="navbar-select-all-btn" onClick={handleSelectAll}>{isAllSelected() ? '取消全选' : '全选'}</button>
              <button className="navbar-batch-btn" onClick={() => { setIsBatchMode(false); setSelectedWorks([]); }}>取消</button>
            </>
          )}
        </div>
      </div>

      <div className="waterfall-container" ref={containerRef}>
        {items.length === 0 ? (
          <div className="empty-state">
            <p>{!activeCollection ? '暂无相册' : '该相册暂无作品'}</p>
            <button onClick={() => !activeCollection ? navigate('/create-collection') : navigate('/upload', { state: { collectionId: activeCollection?.id, collectionFolder: activeCollection?.folder } })}>
              {!activeCollection ? '创建第一个相册' : '添加作品'}
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <p>未找到匹配的结果</p>
          </div>
        ) : !activeCollection ? (
          (submittedQuery.trim()
            ? displayCollections.filter(c => c.name.toLowerCase().includes(submittedQuery.trim().toLowerCase()))
            : displayCollections
          ).map((collection, index) => {
            const { cover, coverPosition: cp } = getCollectionCover(collection);
            return (
              <CollectionCard
                key={collection.id}
                collection={collection}
                index={index}
                position={cardPositions[collection.id] || { left: '0px', top: '0px', width: '16%' }}
                isSelected={selectedWorks.some(w => w.id === collection.id)}
                isBatchMode={isBatchMode}
                isDragging={draggingCollection?.id === collection.id}
                isDragOver={!draggingCollection || draggingCollection.id === collection.id ? false : dragOverIndex === index}
                coverUrl={cover}
                coverPosition={cp}
                coverPositionVertical={collection.coverPositionVertical}
                workCount={collection.images?.length || 0}
                onClick={handleCollectionClick}
                onContextMenu={(e, c) => { e.preventDefault(); e.stopPropagation(); setCollectionContextMenu({ x: e.clientX, y: e.clientY, collection: c }); }}
                onDragStart={handleCollectionDragStart}
                onDragOver={handleCollectionDragOver}
                onDrop={handleCollectionDrop}
                onDragEnd={() => { setDraggingCollection(null); setDragOverIndex(-1); }}
              />
            );
          })
        ) : settings.showDateGrouping ? (
          getWorksGroupedByDate().map(group => {
            const filteredWorks = submittedQuery.trim()
              ? group.works.filter(w => w.title.toLowerCase().includes(submittedQuery.trim().toLowerCase()))
              : group.works;
            if (filteredWorks.length === 0) return null;
            const isGroupSelected = filteredWorks.every(w => selectedWorks.some(s => s.id === w.id));
            return (
              <div key={group.dateStr} className="date-group">
                <div className="date-header" onClick={() => {
                  if (!isBatchMode) return;
                  if (isGroupSelected) setSelectedWorks(prev => prev.filter(s => !filteredWorks.some(w => w.id === s.id)));
                  else setSelectedWorks(prev => [...prev, ...filteredWorks.filter(w => !prev.some(s => s.id === w.id))]);
                }}>
                  <span className="date-text">{group.dateStr}</span>
                  {isBatchMode && <div className={`group-checkbox ${isGroupSelected ? 'checked' : ''}`}>{isGroupSelected && <span className="checkmark">✓</span>}</div>}
                </div>
                <div className="date-group-content">
                  {filteredWorks.map(work => (
                    <WorkCard key={work.id} work={work} isSelected={selectedWorks.some(w => w.id === work.id)}
                      isBatchMode={isBatchMode} useAbsolutePosition={false}
                      onClick={handleCardClick} onContextMenu={(e, w) => { e.preventDefault(); e.stopPropagation(); setWorkContextMenu({ x: e.clientX, y: e.clientY, work: w }); }}
                      isFavorite={isFavorite(work.id)} onToggleFavorite={handleToggleFavorite} />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          filteredItems.map(item => {
            const work = item as WorkData;
            return (
              <WorkCard key={work.id} work={work}
                position={cardPositions[work.id] || { left: '0px', top: '0px', width: '16%' }}
                isSelected={selectedWorks.some(w => w.id === work.id)}
                isBatchMode={isBatchMode}
                onClick={handleCardClick}
                onContextMenu={(e, w) => { e.preventDefault(); e.stopPropagation(); setWorkContextMenu({ x: e.clientX, y: e.clientY, work: w }); }}
                isFavorite={isFavorite(work.id)} onToggleFavorite={handleToggleFavorite} />
            );
          })
        )}
      </div>

      {isBatchMode && (
        <div className="batch-delete-bar">
          {activeCollection ? (
            <>
              <button className="batch-move-btn" onClick={() => { setConfirmAction('move'); setShowMoveConfirm(true); }} disabled={selectedWorks.length === 0}>移动到...</button>
              <button className="batch-move-btn" onClick={() => { setConfirmAction('copy'); setShowMoveConfirm(true); }} disabled={selectedWorks.length === 0}>复制到...</button>
              <button className="batch-download-btn" onClick={async () => {
                const dlPath = settings.downloadPath;
                if (!dlPath) { alert('请先在设置中配置下载路径'); return; }
                if (!isElectronAvailable()) return;
                for (const item of selectedWorks) {
                  await window.electronAPI!.downloadImage((item as WorkData).id, dlPath);
                }
                alert(`已下载 ${selectedWorks.length} 个作品`);
              }} disabled={selectedWorks.length === 0}>下载</button>
              <button className="batch-download-btn" onClick={async () => {
                if (!isElectronAvailable()) return;
                const selectResult = await window.electronAPI!.selectFolder();
                if (!selectResult.success || !selectResult.path) return;
                for (const item of selectedWorks) {
                  await window.electronAPI!.downloadImage((item as WorkData).id, selectResult.path);
                }
                alert(`已保存 ${selectedWorks.length} 个作品到 ${selectResult.path}`);
              }} disabled={selectedWorks.length === 0}>另存为</button>
              <button className="batch-delete-btn" onClick={() => setShowDeleteConfirm(true)} disabled={selectedWorks.length === 0}>删除</button>
            </>
          ) : (
            <>
              <button className="batch-download-btn" onClick={async () => {
                const dlPath = settings.downloadPath;
                if (!dlPath) { alert('请先在设置中配置下载路径'); return; }
                if (!isElectronAvailable()) return;
                for (const item of selectedWorks) {
                  const c = item as Collection;
                  const result = await window.electronAPI!.downloadCollectionImages(c.folder, dlPath, c.images || []);
                  if (!result.success) alert(`下载 ${c.name} 失败: ${result.error}`);
                }
                alert(`已下载 ${selectedWorks.length} 个相册`);
              }} disabled={selectedWorks.length === 0}>下载</button>
              <button className="batch-download-btn" onClick={async () => {
                if (!isElectronAvailable()) return;
                const selectResult = await window.electronAPI!.selectFolder();
                if (!selectResult.success || !selectResult.path) return;
                for (const item of selectedWorks) {
                  const c = item as Collection;
                  await window.electronAPI!.downloadCollectionImages(c.folder, selectResult.path, c.images || []);
                }
                alert(`已保存 ${selectedWorks.length} 个相册到 ${selectResult.path}`);
              }} disabled={selectedWorks.length === 0}>另存为</button>
              <button className="batch-delete-btn" onClick={() => setShowDeleteConfirm(true)} disabled={selectedWorks.length === 0}>删除</button>
            </>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog title="确认删除" message={`确定要删除这 ${selectedWorks.length} 个项目吗？此操作不可恢复！`}
          onConfirm={handleConfirmDelete} onCancel={() => setShowDeleteConfirm(false)} loading={isDeleting} confirmText="确认删除" />
      )}

      {showMoveConfirm && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-dialog">
            <h3 className="delete-confirm-title">{confirmAction === 'copy' ? '复制到...' : '移动到...'}</h3>
            <p className="delete-confirm-message">请选择目标相册：</p>
            <div className="move-collection-list">
              {collections.filter(c => c.id !== activeCollection?.id && c.mode === activeCollection?.mode).map(c => (
                <div key={c.id} className={`move-collection-item ${selectedTargetCollection?.id === c.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTargetCollection(c)}>{c.name}</div>
              ))}
            </div>
            <div className="delete-confirm-buttons">
              <button className="delete-confirm-delete" disabled={!selectedTargetCollection} onClick={() => {
                if (!selectedTargetCollection) return;
                if (confirmAction === 'copy') handleConfirmCopy(selectedTargetCollection);
                else handleConfirmMove(selectedTargetCollection);
              }}>确定</button>
              <button className="delete-confirm-cancel" onClick={() => { setShowMoveConfirm(false); setConfirmAction(null); }}>取消</button>
            </div>
          </div>
        </div>
      )}

      {collectionContextMenu && (
        <ContextMenu x={collectionContextMenu.x} y={collectionContextMenu.y} items={[
          { label: '编辑', onClick: () => navigate('/edit-collection', { state: { collection: collectionContextMenu.collection } }) },
          { label: '下载', onClick: async () => {
            const c = collectionContextMenu.collection;
            const dlPath = settings.downloadPath;
            if (!dlPath) { alert('请先在设置中配置下载路径'); return; }
            if (!isElectronAvailable()) return;
            const result = await window.electronAPI!.downloadCollectionImages(c.folder, dlPath, c.images || []);
            if (result.success) alert(`已下载 ${result.count} 张图片`);
            else alert('下载失败: ' + result.error);
          }},
          { label: '另存为', onClick: async () => {
            const c = collectionContextMenu.collection;
            if (!isElectronAvailable()) return;
            const selectResult = await window.electronAPI!.selectFolder();
            if (!selectResult.success || !selectResult.path) return;
            const result = await window.electronAPI!.downloadCollectionImages(c.folder, selectResult.path, c.images || []);
            if (result.success) alert(`已保存 ${result.count} 张图片到 ${selectResult.path}`);
            else alert('保存失败: ' + result.error);
          }},
          { label: '删除', onClick: async () => {
            const c = collectionContextMenu.collection;
            if (!confirm(`确定要删除相册"${c.name}"吗？`)) return;
            if (isElectronAvailable()) await window.electronAPI!.deleteCollection(c.folder);
            const updated = collections.filter(x => x.id !== c.id);
            setCollections(updated);
            await saveCollections({ collections: updated });
            if (activeCollection?.id === c.id) navigate('/');
          }, danger: true },
        ]} onClose={() => setCollectionContextMenu(null)} />
      )}

      {workContextMenu && (
        <ContextMenu x={workContextMenu.x} y={workContextMenu.y} items={[
          { label: '编辑', onClick: () => navigate('/upload', { state: { editMode: true, workData: workContextMenu.work, collectionId: activeCollection?.id, collectionFolder: activeCollection?.folder } }) },
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
          { label: '移动到...', onClick: () => { setSingleWorkAction(workContextMenu.work); setSelectedTargetCollection(null); setConfirmAction('move'); setShowMoveConfirm(true); } },
          { label: '复制到...', onClick: () => { setSingleWorkAction(workContextMenu.work); setSelectedTargetCollection(null); setConfirmAction('copy'); setShowMoveConfirm(true); } },
          { label: '删除', onClick: async () => {
            const w = workContextMenu.work;
            if (!confirm(`确定要删除作品"${w.title || w.id}"吗？`)) return;
            if (isElectronAvailable()) await window.electronAPI!.deleteFiles(w.id);
            await loadAll();
          }, danger: true },
        ]} onClose={() => setWorkContextMenu(null)} />
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useCollections } from '../../hooks/useCollections';
import { useWorks } from '../../hooks/useWorks';
import { useSettings } from '../../hooks/useSettings';
import { useFavorites } from '../../hooks/useFavorites';
import { isElectronAvailable } from '../../services/electron';
import { formatDate, isSameDay } from '../../utils/format';
import { buildSearchIndex, searchItems, getSuggestions } from '../../utils/search';
import type { SearchIndex, Suggestion } from '../../utils/search';
import { ALL_WORKS_ID, ALL_WORKS_NAME, UNCATEGORIZED_FOLDER } from '../../utils/constants';
import TitleBar from '../common/TitleBar';
import ConfirmDialog from '../common/ConfirmDialog';
import ContextMenu from '../common/ContextMenu';
import CollectionCard from './CollectionCard';
import WorkCard from './WorkCard';
import type { Collection, WorkData } from '../../types';
import styles from './Waterfall.module.css';

interface CardPosition {
  left: string;
  top: string;
  width: string;
}

const savedScrollPositions: Record<string, number> = {};

export default function WaterFall() {
  const navigate = useNavigate();
  const location = useLocation();
  const { folderName } = useParams<{ folderName?: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const { collections, isLoading: collsLoading, setCollections, loadCollections, saveCollections } = useCollections();
  const { works, workMap, isLoading: worksLoading, loadWorks, getCollectionWorks, getAllWorks } = useWorks();
  const { settings } = useSettings();
  const { toggleFavorite, isFavorite, removeFavorites } = useFavorites();
  const isLoading = collsLoading || worksLoading;

  // Scroll positions survive component remount
  const saveScroll = useCallback(() => {
    savedScrollPositions[location.pathname] = window.scrollY;
  }, [location.pathname]);

  const allWorksCollection: Collection = useMemo(() => ({
    id: ALL_WORKS_ID,
    name: ALL_WORKS_NAME,
    folder: ALL_WORKS_ID,
    cover: settings.allWorksCover || null,
    coverPosition: settings.allWorksCoverPosition,
    coverPositionVertical: settings.allWorksCoverPositionVertical,
    images: [],
  }), [settings.allWorksCover, settings.allWorksCoverPosition, settings.allWorksCoverPositionVertical]);

  const activeCollection = useMemo(
    () => {
      if (!folderName) return null;
      if (folderName === ALL_WORKS_ID) return allWorksCollection;
      return collections.find(c => c.folder === folderName) || null;
    },
    [folderName, collections, allWorksCollection],
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
      const restored = savedScrollPositions[location.pathname] || 0;
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
    await Promise.all([loadCollections(), loadWorks()]);
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
    if (!activeCollection) {
      const base = draggingCollection ? displayCollections : collections;
      return [allWorksCollection, ...base];
    }
    if (activeCollection.id === ALL_WORKS_ID) return getAllWorks();
    return getCollectionWorks(activeCollection);
  }, [activeCollection, collections, draggingCollection, displayCollections, getCollectionWorks, getAllWorks, allWorksCollection]);

  const items = useMemo(() => getDisplayItems(), [getDisplayItems]);

  const searchIndex: SearchIndex | null = useMemo(() => {
    if (items.length === 0) return null;
    return buildSearchIndex(items);
  }, [items]);

  const filteredItems = useMemo(() => {
    return searchItems(items, submittedQuery, searchIndex);
  }, [items, submittedQuery, searchIndex]);

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

  const layoutRafRef = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(layoutRafRef.current);
    layoutRafRef.current = requestAnimationFrame(() => {
      initMasonry();
    });
    window.addEventListener('resize', initMasonry);
    return () => {
      cancelAnimationFrame(layoutRafRef.current);
      window.removeEventListener('resize', initMasonry);
    };
  }, [initMasonry, collections, works, activeCollection]);

  useEffect(() => {
    if (draggingCollection && !activeCollection) {
      calculateCardPositions(columnCount);
    }
  }, [dragOverIndex, draggingCollection, columnCount, activeCollection, calculateCardPositions]);

  // Collection cover helper
  const getCollectionCover = useCallback((collection: Collection) => {
    // Virtual "All Works" collection: use settings cover or fallback to latest work
    if (collection.id === ALL_WORKS_ID) {
      if (settings.allWorksCover) {
        return {
          cover: settings.allWorksCover,
          coverPosition: settings.allWorksCoverPosition,
          coverPositionVertical: settings.allWorksCoverPositionVertical,
        };
      }
      // Fallback to latest work's cover
      if (works.length > 0) {
        const sorted = [...works].sort((a, b) => {
          const ta = a.createdAt?.timestamp || a.timestamp || 0;
          const tb = b.createdAt?.timestamp || b.timestamp || 0;
          return tb - ta;
        });
        return { cover: sorted[0].cover, coverPosition: sorted[0].coverPosition };
      }
      return { cover: null, coverPosition: undefined as number | undefined };
    }
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
        const w = workMap.get(imgPath);
        if (w) {
          const ts = w.createdAt?.timestamp || w.timestamp || 0;
          if (ts > latestTs) { latestTs = ts; latestWork = w; }
        }
      }
      if (latestWork) return { cover: latestWork.cover, coverPosition: latestWork.coverPosition };
    }
    return { cover: null, coverPosition: undefined as number | undefined };
  }, [workMap, settings.allWorksCover, settings.allWorksCoverPosition, settings.allWorksCoverPositionVertical]);

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
    const ws = activeCollection.id === ALL_WORKS_ID ? getAllWorks() : getCollectionWorks(activeCollection);
    return ws.length > 0 && selectedWorks.length === ws.length;
  }, [activeCollection, collections, selectedWorks, getCollectionWorks, getAllWorks]);

  const handleSelectAll = useCallback(() => {
    if (isAllSelected()) {
      setSelectedWorks([]);
    } else if (!activeCollection) {
      setSelectedWorks([...collections]);
    } else {
      const ws = activeCollection.id === ALL_WORKS_ID ? getAllWorks() : getCollectionWorks(activeCollection);
      setSelectedWorks([...ws]);
    }
  }, [isAllSelected, activeCollection, collections, getCollectionWorks]);

  const selectedWorkIds = useMemo(() => new Set(selectedWorks.map(s => s.id)), [selectedWorks]);

  const handleToggleFavorite = useCallback((_e: React.MouseEvent, work: WorkData) => {
    toggleFavorite(work.id);
  }, [toggleFavorite]);

  const handleWorkContextMenu = useCallback((e: React.MouseEvent, work: WorkData) => {
    e.preventDefault();
    e.stopPropagation();
    setWorkContextMenu({ x: e.clientX, y: e.clientY, work });
  }, []);

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
      removeFavorites(selectedWorks.map(s => s.id));
      setShowDeleteConfirm(false);
      setIsBatchMode(false);
      setSelectedWorks([]);
    } catch (error: any) {
      alert('删除失败：' + error.message);
    } finally {
      setIsDeleting(false);
    }
  }, [activeCollection, selectedWorks, collections, setCollections, saveCollections, loadAll, removeFavorites]);

  // Move works (batch or single)
  const handleConfirmMove = useCallback(async (target: Collection) => {
    if (!activeCollection || !isElectronAvailable()) return;
    const api = window.electronAPI!;
    const worksToMove = singleWorkAction ? [singleWorkAction] : selectedWorks;

    for (const item of worksToMove) {
      const w = item as WorkData;
      const result = await api.moveWorkFolder(w.id, target.id);
      if (!result.success) { alert('移动失败: ' + result.error); return; }
    }

    setShowMoveConfirm(false);
    setSelectedWorks([]);
    setSingleWorkAction(null);
    setIsBatchMode(false);
    await loadAll();
  }, [activeCollection, singleWorkAction, selectedWorks, loadAll]);

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

  // Date grouping (memoized)
  const dateGroups = useMemo(() => {
    if (!activeCollection) return [];
    const collWorks = activeCollection.id === ALL_WORKS_ID
      ? getAllWorks()
      : getCollectionWorks(activeCollection);
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
  }, [activeCollection, getCollectionWorks, getAllWorks, settings.workSortOrder]);

  const suggestions: Suggestion[] = useMemo(() => {
    if (!inputQuery.trim()) return [];
    return getSuggestions(searchIndex, inputQuery.trim(), 8);
  }, [inputQuery, searchIndex]);

  if (isLoading) return <div className={styles.waterfallPage}><div className={styles.loading}>加载中...</div></div>;

  return (
    <div className={`${styles.waterfallPage} ${isBatchMode ? styles.batchMode : ''}`}>
      <TitleBar title={!activeCollection ? 'Pixium' : activeCollection.name} onBack={activeCollection ? handleBackToCollections : undefined} />

      <div className={styles.navbarActionsBar}>
        <div className={styles.searchWrapper}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={!activeCollection ? '搜索相册...' : '搜索作品...'}
            value={inputQuery}
            onChange={e => { setInputQuery(e.target.value); setShowSuggestions(true); }}
            onKeyDown={e => { if (e.key === 'Enter') { setSubmittedQuery(inputQuery); setShowSuggestions(false); } }}
            onFocus={() => { if (inputQuery.trim()) setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            spellCheck={false}
          />
          {inputQuery.trim() && (
            <button
              className={styles.searchClearBtn}
              onClick={() => { setInputQuery(''); setSubmittedQuery(''); }}
              title="清除搜索"
            >
              <svg width="14" height="14" viewBox="0 0 16 16"><line x1="4" y1="4" x2="12" y2="12" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/><line x1="12" y1="4" x2="4" y2="12" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/></svg>
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className={styles.searchSuggestions}>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className={styles.searchSuggestionItem}
                  onMouseDown={() => { setInputQuery(s.text); setSubmittedQuery(s.text); setShowSuggestions(false); }}
                >
                  <span className={styles.suggestionText}>{s.text}</span>
                  <span className={styles.suggestionField}>{s.field}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.navbarActions}>
          {!isBatchMode ? (
            <>
              <button className={styles.navbarBatchBtn} onClick={() => setIsBatchMode(true)}>批量选择</button>
              {!activeCollection ? (
                <button className={styles.navbarAddBtn} onClick={() => navigate('/create-collection')}>
                  新建相册
                </button>
              ) : (
                <button className={styles.navbarAddBtn} onClick={() => {
                  if (activeCollection.id === ALL_WORKS_ID) {
                    navigate('/upload', { state: { isAllWorks: true, collectionFolder: UNCATEGORIZED_FOLDER } });
                  } else {
                    navigate('/upload', { state: { collectionId: activeCollection.id, collectionFolder: activeCollection.folder } });
                  }
                }}>
                  添加作品
                </button>
              )}
            </>
          ) : (
            <>
              <span className={styles.selectedCount}>{selectedWorks.length} 个已选</span>
              <button className={styles.navbarSelectAllBtn} onClick={handleSelectAll}>{isAllSelected() ? '取消全选' : '全选'}</button>
              <button className={styles.navbarCancelBtn} onClick={() => { setIsBatchMode(false); setSelectedWorks([]); }}>取消</button>
            </>
          )}
        </div>
      </div>

      <div className={styles.waterfallContainer} ref={containerRef}>
        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <p>{!activeCollection ? '暂无相册' : '该相册暂无作品'}</p>
            <button onClick={() => !activeCollection ? navigate('/create-collection') : navigate('/upload', { state: { collectionId: activeCollection?.id, collectionFolder: activeCollection?.folder } })}>
              {!activeCollection ? '创建第一个相册' : '添加作品'}
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className={styles.emptyState}>
            <p>未找到匹配的结果</p>
          </div>
        ) : !activeCollection ? (
          filteredItems.map((item, index) => {
            const collection = item as Collection;
            const isVirtual = collection.id === ALL_WORKS_ID;
            const { cover, coverPosition: cp } = getCollectionCover(collection);
            return (
              <CollectionCard
                key={collection.id}
                collection={collection}
                index={isVirtual ? -1 : index}
                position={cardPositions[collection.id] || { left: '0px', top: '0px', width: '16%' }}
                isSelected={selectedWorks.some(w => w.id === collection.id)}
                isBatchMode={isBatchMode}
                isDragging={isVirtual ? false : draggingCollection?.id === collection.id}
                isDragOver={isVirtual ? false : (!draggingCollection || draggingCollection.id === collection.id ? false : dragOverIndex === index)}
                coverUrl={cover}
                coverPosition={cp}
                coverPositionVertical={collection.coverPositionVertical}
                workCount={isVirtual ? works.length : (collection.images?.length || 0)}
                onClick={handleCollectionClick}
                onContextMenu={isVirtual
                  ? (e, c) => { e.preventDefault(); e.stopPropagation(); }
                  : (e, c) => { e.preventDefault(); e.stopPropagation(); setCollectionContextMenu({ x: e.clientX, y: e.clientY, collection: c }); }
                }
                onDragStart={isVirtual ? () => {} : handleCollectionDragStart}
                onDragOver={isVirtual ? () => {} : handleCollectionDragOver}
                onDrop={isVirtual ? () => {} : handleCollectionDrop}
                onDragEnd={isVirtual ? () => {} : () => { setDraggingCollection(null); setDragOverIndex(-1); }}
              />
            );
          })
        ) : settings.showDateGrouping ? (
          dateGroups.map(group => {
            const filteredWorks = submittedQuery.trim()
              ? group.works.filter(w => filteredItems.some(fi => fi.id === w.id))
              : group.works;
            if (filteredWorks.length === 0) return null;
            const isGroupSelected = filteredWorks.every(w => selectedWorkIds.has(w.id));
            return (
              <div key={group.dateStr} className={styles.dateGroup}>
                <div className={styles.dateHeader} onClick={() => {
                  if (!isBatchMode) return;
                  if (isGroupSelected) setSelectedWorks(prev => prev.filter(s => !filteredWorks.some(w => w.id === s.id)));
                  else setSelectedWorks(prev => [...prev, ...filteredWorks.filter(w => !prev.some(s => s.id === w.id))]);
                }}>
                  <span className={styles.dateText}>{group.dateStr}</span>
                  {isBatchMode && <div className={`${styles.groupCheckbox} ${isGroupSelected ? styles.checked : ''}`}>{isGroupSelected && <span className={styles.checkmark}>✓</span>}</div>}
                </div>
                <div className={styles.dateGroupContent}>
                  {filteredWorks.map(work => (
                    <WorkCard key={work.id} work={work} isSelected={selectedWorkIds.has(work.id)}
                      isBatchMode={isBatchMode} useAbsolutePosition={false}
                      onClick={handleCardClick} onContextMenu={handleWorkContextMenu}
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
                isSelected={selectedWorkIds.has(work.id)}
                isBatchMode={isBatchMode}
                onClick={handleCardClick}
                onContextMenu={handleWorkContextMenu}
                isFavorite={isFavorite(work.id)} onToggleFavorite={handleToggleFavorite} />
            );
          })
        )}
      </div>

      {isBatchMode && (
        <div className={styles.batchDeleteBar}>
          {activeCollection ? (
            <>
              <button className={styles.batchMoveBtn} onClick={() => { setConfirmAction('move'); setShowMoveConfirm(true); }} disabled={selectedWorks.length === 0}>移动到...</button>
              <button className={styles.batchMoveBtn} onClick={() => { setConfirmAction('copy'); setShowMoveConfirm(true); }} disabled={selectedWorks.length === 0}>复制到...</button>
              <button className={styles.batchDownloadBtn} onClick={async () => {
                const dlPath = settings.downloadPath;
                if (!dlPath) { alert('请先在设置中配置下载路径'); return; }
                if (!isElectronAvailable()) return;
                for (const item of selectedWorks) {
                  await window.electronAPI!.downloadImage((item as WorkData).id, dlPath);
                }
                alert(`已下载 ${selectedWorks.length} 个作品`);
              }} disabled={selectedWorks.length === 0}>下载</button>
              <button className={styles.batchDownloadBtn} onClick={async () => {
                if (!isElectronAvailable()) return;
                const selectResult = await window.electronAPI!.selectFolder();
                if (!selectResult.success || !selectResult.path) return;
                for (const item of selectedWorks) {
                  await window.electronAPI!.downloadImage((item as WorkData).id, selectResult.path);
                }
                alert(`已保存 ${selectedWorks.length} 个作品到 ${selectResult.path}`);
              }} disabled={selectedWorks.length === 0}>另存为</button>
              <button className={styles.batchDeleteBtn} onClick={() => setShowDeleteConfirm(true)} disabled={selectedWorks.length === 0}>删除</button>
            </>
          ) : (
            <>
              <button className={styles.batchDownloadBtn} onClick={async () => {
                const dlPath = settings.downloadPath;
                if (!dlPath) { alert('请先在设置中配置下载路径'); return; }
                if (!isElectronAvailable()) return;
                if (selectedWorks.length === 1 && selectedWorks[0].id === ALL_WORKS_ID) {
                  for (const w of works) {
                    await window.electronAPI!.downloadImage(w.id, dlPath);
                  }
                  alert(`已下载 ${works.length} 个作品`);
                } else {
                  for (const item of selectedWorks) {
                    const c = item as Collection;
                    const result = await window.electronAPI!.downloadCollectionImages(c.folder, dlPath, c.images || []);
                    if (!result.success) alert(`下载 ${c.name} 失败: ${result.error}`);
                  }
                  alert(`已下载 ${selectedWorks.length} 个相册`);
                }
              }} disabled={selectedWorks.length === 0 || (selectedWorks.some(w => w.id === ALL_WORKS_ID) && selectedWorks.length > 1)}>下载</button>
              <button className={styles.batchDownloadBtn} onClick={async () => {
                if (!isElectronAvailable()) return;
                const selectResult = await window.electronAPI!.selectFolder();
                if (!selectResult.success || !selectResult.path) return;
                if (selectedWorks.length === 1 && selectedWorks[0].id === ALL_WORKS_ID) {
                  for (const w of works) {
                    await window.electronAPI!.downloadImage(w.id, selectResult.path);
                  }
                  alert(`已保存 ${works.length} 个作品到 ${selectResult.path}`);
                } else {
                  for (const item of selectedWorks) {
                    const c = item as Collection;
                    await window.electronAPI!.downloadCollectionImages(c.folder, selectResult.path, c.images || []);
                  }
                  alert(`已保存 ${selectedWorks.length} 个相册到 ${selectResult.path}`);
                }
              }} disabled={selectedWorks.length === 0 || (selectedWorks.some(w => w.id === ALL_WORKS_ID) && selectedWorks.length > 1)}>另存为</button>
              <button className={styles.batchDeleteBtn} onClick={() => setShowDeleteConfirm(true)} disabled={selectedWorks.length === 0 || selectedWorks.some(w => w.id === ALL_WORKS_ID)}>删除</button>
            </>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog title="确认删除" message={`确定要删除这 ${selectedWorks.length} 个项目吗？此操作不可恢复！`}
          onConfirm={handleConfirmDelete} onCancel={() => setShowDeleteConfirm(false)} loading={isDeleting} confirmText="确认删除" />
      )}

      {showMoveConfirm && (
        <div className={styles.deleteConfirmOverlay} onClick={() => { setShowMoveConfirm(false); setConfirmAction(null); setSingleWorkAction(null); }}>
          <div className={styles.deleteConfirmDialog} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') { setShowMoveConfirm(false); setConfirmAction(null); setSingleWorkAction(null); } }}>
            <h3 className={styles.deleteConfirmTitle}>{confirmAction === 'copy' ? '复制到...' : '移动到...'}</h3>
            <p className={styles.deleteConfirmMessage}>请选择目标相册：</p>
            <div className={styles.moveCollectionList}>
              {activeCollection?.id !== ALL_WORKS_ID && (
                <div
                  className={`${styles.moveCollectionItem} ${selectedTargetCollection?.id === ALL_WORKS_ID ? styles.selected : ''}`}
                  onClick={() => setSelectedTargetCollection({ id: ALL_WORKS_ID, name: ALL_WORKS_NAME, folder: ALL_WORKS_ID, images: [], cover: null } as Collection)}
                >
                  {ALL_WORKS_NAME}（未分类）
                </div>
              )}
              {collections.filter(c => c.id !== activeCollection?.id).map(c => (
                <div key={c.id} className={`${styles.moveCollectionItem} ${selectedTargetCollection?.id === c.id ? styles.selected : ''}`}
                  onClick={() => setSelectedTargetCollection(c)}>{c.name}</div>
              ))}
            </div>
            <div className={styles.deleteConfirmButtons}>
              <button className={styles.deleteConfirmDelete} disabled={!selectedTargetCollection} onClick={() => {
                if (!selectedTargetCollection) return;
                if (confirmAction === 'copy') handleConfirmCopy(selectedTargetCollection);
                else handleConfirmMove(selectedTargetCollection);
              }}>确定</button>
              <button className={styles.deleteConfirmCancel} onClick={() => { setShowMoveConfirm(false); setConfirmAction(null); setSingleWorkAction(null); }}>取消</button>
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
            removeFavorites([w.id]);
            await loadAll();
          }, danger: true },
        ]} onClose={() => setWorkContextMenu(null)} />
      )}
    </div>
  );
}

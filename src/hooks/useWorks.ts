import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { WorkData, Collection } from '../types';
import { isElectronAvailable } from '../services/electron';

export function useWorks() {
  const [works, setWorks] = useState<WorkData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadWorks = useCallback(async () => {
    try {
      if (!isElectronAvailable()) {
        setIsLoading(false);
        return;
      }
      const result = await window.electronAPI!.readWorks();
      if (result.success) {
        let sortOrder = 'desc';
        try {
          const saved = localStorage.getItem('collectionSettings');
          if (saved) {
            const settings = JSON.parse(saved);
            sortOrder = settings.workSortOrder || 'desc';
          }
        } catch { /* ignore */ }

        const sorted = [...(result.works || [])].sort((a, b) => {
          const timeA = a.createdAt?.timestamp || a.timestamp || 0;
          const timeB = b.createdAt?.timestamp || b.timestamp || 0;
          return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        });
        setWorks(sorted);
      }
    } catch (error) {
      console.error('加载作品失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const workMap = useMemo(() => {
    const map = new Map<string, WorkData>();
    for (const w of works) {
      map.set(w.id, w);
      if (w.folder && w.folder !== w.id) map.set(w.folder, w);
    }
    return map;
  }, [works]);

  const getCollectionWorks = useCallback((collection: Collection): WorkData[] => {
    if (!collection.images?.length) return [];

    const collectionWorks = collection.images
      .map(workId => workMap.get(workId))
      .filter((w): w is WorkData => w != null);

    let sortOrder = 'desc';
    try {
      const saved = localStorage.getItem('collectionSettings');
      if (saved) {
        sortOrder = JSON.parse(saved).workSortOrder || 'desc';
      }
    } catch { /* ignore */ }

    return collectionWorks.sort((a, b) => {
      const timeA = a.createdAt?.timestamp || a.timestamp || 0;
      const timeB = b.createdAt?.timestamp || b.timestamp || 0;
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [workMap]);

  useEffect(() => {
    loadWorks();
  }, [loadWorks]);

  // Watch for file changes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isElectronAvailable()) return;

    window.electronAPI!.startWatchWorks();
    const removeListener = window.electronAPI!.onWorksChanged(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        loadWorks();
      }, 300);
    });

    return () => {
      removeListener?.();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [loadWorks]);

  return {
    works,
    setWorks,
    isLoading,
    loadWorks,
    getCollectionWorks,
  };
}

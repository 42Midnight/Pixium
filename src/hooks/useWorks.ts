import { useState, useCallback, useEffect } from 'react';
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

  const getCollectionWorks = useCallback((collection: Collection): WorkData[] => {
    if (!collection.images?.length) return [];

    const collectionWorks = collection.images
      .map(workId => works.find(w => w.id === workId || w.folder === workId))
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
  }, [works]);

  useEffect(() => {
    loadWorks();
  }, [loadWorks]);

  // Watch for file changes
  useEffect(() => {
    if (!isElectronAvailable()) return;

    window.electronAPI!.startWatchWorks();
    const removeListener = window.electronAPI!.onWorksChanged(() => {
      loadWorks();
    });

    return () => {
      removeListener?.();
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

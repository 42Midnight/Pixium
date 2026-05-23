import { useState, useCallback, useEffect } from 'react';
import type { Collection, CollectionData } from '../types';
import { isElectronAvailable } from '../services/electron';

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCollections = useCallback(async () => {
    try {
      if (!isElectronAvailable()) { setIsLoading(false); return; }
      const result = await window.electronAPI!.readCollections();
      if (result.success) {
        const cleaned = (result.data.collections || []).map(c => {
          if (c.cover) {
            const expectedPath = `image/collection_covers/${c.folder}/cover.`;
            if (!c.cover.includes(expectedPath)) {
              return { ...c, cover: null, coverPosition: undefined };
            }
          }
          return c;
        });
        setCollections(cleaned);
      }
    } catch (error) {
      console.error('加载相册失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveCollections = useCallback(async (data: CollectionData) => {
    if (!isElectronAvailable()) return;
    await window.electronAPI!.saveCollections(data);
  }, []);

  const addCollection = useCallback(async (collection: Collection) => {
    const result = await window.electronAPI?.readCollections();
    if (!result?.success) return;

    const data = result.data;
    let sortOrder: string = 'desc';
    try {
      const saved = localStorage.getItem('collectionSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        sortOrder = settings.collectionSortOrder || 'desc';
      }
    } catch { /* ignore */ }

    const updatedCollections =
      sortOrder === 'asc'
        ? [collection, ...(data.collections || [])]
        : [...(data.collections || []), collection];

    await window.electronAPI?.saveCollections({ collections: updatedCollections });
  }, []);

  const updateCollectionInList = useCallback(async (id: string, updates: Partial<Collection>) => {
    const result = await window.electronAPI?.readCollections();
    if (!result?.success) return;

    const updated = result.data.collections.map(c =>
      c.id === id ? { ...c, ...updates } : c
    );
    await window.electronAPI?.saveCollections({ collections: updated });
    await loadCollections();
  }, [loadCollections]);

  const removeCollection = useCallback(async (id: string) => {
    const updated = collections.filter(c => c.id !== id);
    setCollections(updated);
    await window.electronAPI?.saveCollections({ collections: updated });
  }, [collections]);

  return {
    collections,
    isLoading,
    setCollections,
    loadCollections,
    saveCollections,
    addCollection,
    updateCollectionInList,
    removeCollection,
  };
}

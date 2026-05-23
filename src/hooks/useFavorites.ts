import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'favorites';

function readFavorites(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('读取喜欢失败:', e);
  }
  return [];
}

function writeFavorites(favorites: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(readFavorites);

  useEffect(() => {
    writeFavorites(favorites);
  }, [favorites]);

  const toggleFavorite = useCallback((workId: string) => {
    setFavorites(prev => {
      const index = prev.indexOf(workId);
      if (index >= 0) {
        return prev.filter(id => id !== workId);
      }
      return [workId, ...prev];
    });
  }, []);

  const isFavorite = useCallback((workId: string): boolean => {
    return favorites.includes(workId);
  }, [favorites]);

  const removeFavorites = useCallback((workIds: string[]) => {
    setFavorites(prev => prev.filter(id => !workIds.includes(id)));
  }, []);

  return { favorites, toggleFavorite, isFavorite, removeFavorites };
}

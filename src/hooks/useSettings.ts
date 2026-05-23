import { useState, useCallback, useEffect } from 'react';
import type { AppSettings } from '../types';

const STORAGE_KEY = 'collectionSettings';

const DEFAULTS: AppSettings = {
  collectionSortOrder: 'desc',
  workSortOrder: 'desc',
  showDateGrouping: false,
  downloadPath: '',
  showImageFilename: true,
  favoritesSortOrder: 'newest',
};

function readSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULTS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('读取设置失败:', e);
  }
  return { ...DEFAULTS };
}

function writeSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(readSettings);

  useEffect(() => {
    writeSettings(settings);
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  return { settings, updateSetting };
}

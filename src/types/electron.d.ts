import type { WorkData } from './work';
import type { CollectionData, Collection } from './collection';
import type { Template } from './template';
import type { AppSettings } from './settings';

export interface ElectronAPI {
  saveImage: (fileName: string, bufferArray: number[]) => Promise<{ success: boolean; path?: string; error?: string }>;
  createFolder: (folderName: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  deleteFiles: (workId?: string, imageFileName?: string, jsonFileName?: string) => Promise<{ success: boolean; error?: string }>;
  deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  deleteCollection: (folderName: string) => Promise<{ success: boolean; error?: string }>;
  readWorks: () => Promise<{ success: boolean; works: WorkData[]; error?: string }>;
  readCollections: () => Promise<{ success: boolean; data: CollectionData; error?: string }>;
  saveCollections: (data: CollectionData) => Promise<{ success: boolean; error?: string }>;
  renameFolder: (oldName: string, newName: string) => Promise<{ success: boolean; error?: string }>;
  moveWorkFolder: (workId: string, targetCollectionId: string) => Promise<{ success: boolean; newWorkId?: string; oldCollectionId?: string; newCollectionId?: string; error?: string; message?: string }>;
  copyWorkFolder: (workId: string, targetCollectionId: string) => Promise<{ success: boolean; newWorkId?: string; error?: string }>;
  readWorkDetail: (fileName: string) => Promise<{ success: boolean; workData?: WorkData; error?: string }>;
  loadTemplates: () => Promise<{ success: boolean; data: Template[]; error?: string }>;
  saveTemplates: (templates: Template[]) => Promise<{ success: boolean; error?: string }>;
  readSettings: () => Promise<{ success: boolean; data: { newCollectionPosition: string }; error?: string }>;
  saveSettings: (settings: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  startWatchWorks: () => Promise<{ success: boolean; error?: string }>;
  onWorksChanged: (callback: () => void) => () => void;
  selectFolder: () => Promise<{ success: boolean; path?: string; error?: string }>;
  downloadImage: (workId: string, targetPath: string) => Promise<{ success: boolean; path?: string; count?: number; error?: string }>;
  downloadCollectionImages: (collectionFolder: string, targetPath: string, imagePaths: string[]) => Promise<{ success: boolean; count?: number; error?: string }>;
  saveImageAs: (imagePath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  downloadSingleImage: (imagePath: string, targetPath: string, fileName: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  getImageURL: (relativePath: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  toggleAlwaysOnTop: () => Promise<{ success: boolean; alwaysOnTop: boolean }>;
  getAlwaysOnTop: () => Promise<{ success: boolean; alwaysOnTop: boolean }>;
  winMinimize: () => Promise<void>;
  winMaximize: () => Promise<void>;
  winClose: () => Promise<void>;
  winIsMaximized: () => Promise<{ maximized: boolean }>;
  onWindowStateChanged: (callback: (data: { maximized: boolean }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

import { ipcMain, dialog, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { getAppRootPath, ensureDir, getMainWindow } from '../context.js';

export function registerSettingsHandlers(): void {
  ipcMain.handle('toggle-always-on-top', async () => {
    const win = getMainWindow();
    if (!win) return { success: false, alwaysOnTop: false };
    const newState = !win.isAlwaysOnTop();
    win.setAlwaysOnTop(newState);
    return { success: true, alwaysOnTop: newState };
  });

  ipcMain.handle('get-always-on-top', async () => {
    const win = getMainWindow();
    return { success: true, alwaysOnTop: win?.isAlwaysOnTop() ?? false };
  });

  ipcMain.handle('win-minimize', async () => { getMainWindow()?.minimize(); });
  ipcMain.handle('win-maximize', async () => {
    const win = getMainWindow();
    if (win?.isMaximized()) win.unmaximize(); else win?.maximize();
  });
  ipcMain.handle('win-close', async () => { getMainWindow()?.close(); });
  ipcMain.handle('win-is-maximized', async () => ({ maximized: getMainWindow()?.isMaximized() ?? false }));
  ipcMain.handle('read-settings', async () => {
    try {
      const settingsFile = path.join(getAppRootPath(), 'data', 'settings.json');
      if (!fs.existsSync(settingsFile)) {
        return { success: true, data: { newCollectionPosition: 'front' } };
      }
      const data = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
      return { success: true, data: { newCollectionPosition: 'front', ...data } };
    } catch (error: any) {
      console.error('read-settings error:', error);
      return { success: false, error: error.message, data: { newCollectionPosition: 'front' } };
    }
  });

  ipcMain.handle('save-settings', async (_event, settings: any) => {
    try {
      const dataDir = path.join(getAppRootPath(), 'data');
      ensureDir(dataDir);
      fs.writeFileSync(path.join(dataDir, 'settings.json'), JSON.stringify(settings, null, 2), 'utf-8');
      return { success: true };
    } catch (error: any) {
      console.error('save-settings error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('select-folder', async () => {
    try {
      const win = getMainWindow();
      if (!win) return { success: false, error: '窗口不存在' };

      const result = await dialog.showOpenDialog(win, {
        properties: ['openDirectory'],
        title: '选择下载位置',
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return { success: true, path: result.filePaths[0] };
      }
      return { success: false, error: '用户取消选择' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('download-collection-images', async (_event, _collectionFolder: string, targetPath: string, imagePaths: string[]) => {
    try {
      const appRootPath = getAppRootPath();
      ensureDir(targetPath);
      let count = 0;

      for (const imagePath of imagePaths) {
        const workFolderPath = path.join(appRootPath, 'image', imagePath);
        if (!fs.existsSync(workFolderPath)) continue;

        try {
          for (const file of fs.readdirSync(workFolderPath)) {
            const ext = path.extname(file).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
              fs.copyFileSync(path.join(workFolderPath, file), path.join(targetPath, file));
              count++;
            }
          }
        } catch { /* skip unreadable folders */ }
      }

      return { success: true, count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}

import { ipcMain, dialog, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { getAppRootPath, getMainWindow, ensureDir } from '../context.js';

export function registerImageHandlers(): void {
  ipcMain.handle('save-image', async (_event, fileName: string, bufferArray: number[]) => {
    try {
      const appRootPath = getAppRootPath();
      const imagePath = path.join(appRootPath, 'image', fileName);
      ensureDir(path.dirname(imagePath));
      fs.writeFileSync(imagePath, Buffer.from(bufferArray));
      return { success: true, path: imagePath };
    } catch (error: any) {
      console.error('save-image error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-file', async (_event, filePath: string) => {
    try {
      const fullPath = path.join(getAppRootPath(), 'image', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('download-image', async (_event, workId: string, targetPath: string) => {
    try {
      const workFolderPath = path.join(getAppRootPath(), 'image', workId);
      if (!fs.existsSync(workFolderPath)) {
        return { success: false, error: '作品文件夹不存在' };
      }
      ensureDir(targetPath);

      const files = fs.readdirSync(workFolderPath);
      const imageFiles = files.filter(file =>
        ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(path.extname(file).toLowerCase())
      );

      let count = 0;
      for (const imageFile of imageFiles) {
        fs.copyFileSync(path.join(workFolderPath, imageFile), path.join(targetPath, imageFile));
        count++;
      }
      return { success: true, path: targetPath, count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('save-image-as', async (_event, imagePath: string) => {
    try {
      let sourcePath = resolveImagePath(imagePath);
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: '图片文件不存在' };
      }

      const win = getMainWindow();
      if (!win) return { success: false, error: '窗口不存在' };

      const result = await dialog.showSaveDialog(win, {
        title: '保存图片',
        defaultPath: path.basename(sourcePath),
        filters: [
          { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      });

      if (result.canceled) return { success: false, error: '用户取消保存' };

      ensureDir(path.dirname(result.filePath!));
      fs.copyFileSync(sourcePath, result.filePath!);
      return { success: true, path: result.filePath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('download-single-image', async (_event, imagePath: string, targetPath: string, fileName: string) => {
    try {
      let sourcePath = resolveImagePath(imagePath);
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: '图片文件不存在' };
      }
      ensureDir(targetPath);
      const destinationPath = path.join(targetPath, fileName);
      fs.copyFileSync(sourcePath, destinationPath);
      return { success: true, path: destinationPath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-image-url', async (_event, relativePath: string) => {
    try {
      const { getImageURL } = await import('../context.js');
      return { success: true, url: getImageURL(relativePath) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}

function resolveImagePath(imagePath: string): string {
  const appRootPath = getAppRootPath();
  let relativePath = imagePath;

  // Remove protocol prefixes to get the relative path
  for (const prefix of ['pixium:///', 'pixium://', 'file:///', 'file://']) {
    if (relativePath.startsWith(prefix)) {
      relativePath = relativePath.substring(prefix.length);
      break;
    }
  }

  // Try as full absolute path first (for file:/// URLs on Windows like C:/...)
  const absolutePath = relativePath.replace(/\//g, path.sep);
  if (fs.existsSync(absolutePath)) return absolutePath;

  // Try relative to app root (for pixium:// URLs: "image/safe/work1/img.jpg")
  const fromAppRoot = path.join(appRootPath, relativePath.replace(/\//g, path.sep));
  if (fs.existsSync(fromAppRoot)) return fromAppRoot;

  // Try appRoot/image/prefix (for paths without "image/" prefix)
  const fromImageRoot = path.join(appRootPath, 'image', relativePath.replace(/\//g, path.sep));
  if (fs.existsSync(fromImageRoot)) return fromImageRoot;

  // Last resort: search image/ recursively for filename
  const imageDir = path.join(appRootPath, 'image');
  if (fs.existsSync(imageDir)) {
    const baseName = path.basename(relativePath);
    const found = findFile(imageDir, baseName);
    if (found) return found;
  }

  return absolutePath; // Return raw path even if not found (let caller handle error)
}

function findFile(dir: string, targetName: string): string | null {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = findFile(fullPath, targetName);
        if (found) return found;
      } else if (entry.name === targetName) {
        return fullPath;
      }
    }
  } catch { /* skip unreadable */ }
  return null;
}

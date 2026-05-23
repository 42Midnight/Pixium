import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { getAppRootPath, getImageURL, deleteFolderContent, getMainWindow } from '../context.js';

let fileWatcher: fs.FSWatcher | null = null;

export function registerWorkHandlers(): void {
  ipcMain.handle('read-works', async () => {
    try {
      const imagePath = path.join(getAppRootPath(), 'image');
      if (!fs.existsSync(imagePath)) {
        return { success: true, works: [] };
      }

      const works: any[] = [];

      const scanFolder = (currentPath: string, relativePath = '') => {
        for (const item of fs.readdirSync(currentPath)) {
          const itemPath = path.join(currentPath, item);
          if (!fs.statSync(itemPath).isDirectory()) continue;

          const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;
          if (itemRelativePath.startsWith('collection_covers')) continue;

          const infoFile = path.join(itemPath, 'info.json');
          if (fs.existsSync(infoFile)) {
            const workData = JSON.parse(fs.readFileSync(infoFile, 'utf-8'));
            if (workData.images?.length > 0) {
              if (!workData.cover) {
                workData.cover = getImageURL(`image/${itemRelativePath}/${workData.images[0]}`);
              }
              workData.fileName = `${itemRelativePath}/${workData.images[0]}`;
            }
            workData.id = itemRelativePath;
            workData.folder = itemRelativePath;
            works.push(workData);
          }

          scanFolder(itemPath, itemRelativePath);
        }
      };

      scanFolder(imagePath);
      return { success: true, works };
    } catch (error: any) {
      console.error('read-works error:', error);
      return { success: false, error: error.message, works: [] };
    }
  });

  ipcMain.handle('read-work-detail', async (_event, fileName: string) => {
    try {
      const imageDir = path.join(getAppRootPath(), 'image');
      let cleanFileName = fileName.startsWith('image/') ? fileName.substring(6) : fileName;
      const pathParts = cleanFileName.split('/');

      let infoFilePath: string;
      let imageFolderPath: string | null = null;

      const directWorkPath = path.join(imageDir, cleanFileName, 'info.json');
      if (fs.existsSync(directWorkPath)) {
        infoFilePath = directWorkPath;
        imageFolderPath = path.join(imageDir, cleanFileName);
      } else if (pathParts.length > 1) {
        const folderPath = pathParts.slice(0, -1).join('/');
        infoFilePath = path.join(imageDir, folderPath, 'info.json');
        imageFolderPath = path.join(imageDir, folderPath);
      } else {
        const fileNameWithoutExt = cleanFileName.replace(/\.[^/.]+$/, '');
        infoFilePath = path.join(getAppRootPath(), 'data', `${fileNameWithoutExt}.json`);
      }

      let workData: any = null;
      if (fs.existsSync(infoFilePath)) {
        workData = JSON.parse(fs.readFileSync(infoFilePath, 'utf-8'));
        workData.fileName = cleanFileName;

        if (!workData.id) {
          workData.id = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : cleanFileName.replace(/\.[^/.]+$/, '');
        }
        if (!workData.cover && workData.images?.length > 0) {
          const firstImage = workData.images[0];
          const folderPath = cleanFileName.includes('/') ? cleanFileName.substring(0, cleanFileName.lastIndexOf('/')) : '';
          workData.cover = folderPath
            ? getImageURL(`image/${folderPath}/${firstImage}`)
            : getImageURL(`image/${firstImage}`);
        }
      } else if (imageFolderPath && fs.existsSync(imageFolderPath)) {
        const imageFiles = fs.readdirSync(imageFolderPath).filter(file =>
          ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(path.extname(file).toLowerCase())
        );
        if (imageFiles.length > 0) {
          workData = {
            id: pathParts.slice(0, -1).join('/'),
            title: pathParts[0],
            cover: getImageURL(fileName),
            fileName,
            prompt: null,
            images: imageFiles,
          };
        }
      }

      if (!workData) return { success: false, error: '未找到作品数据' };
      return { success: true, workData };
    } catch (error: any) {
      console.error('read-work-detail error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-files', async (_event, workId?: string, imageFileName?: string, jsonFileName?: string) => {
    try {
      const appRootPath = getAppRootPath();

      if (workId?.includes('/')) {
        const folderPath = path.join(appRootPath, 'image', workId);
        if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
          deleteFolderContent(folderPath);
          if (fs.existsSync(folderPath)) fs.rmdirSync(folderPath);
        }
      } else if (workId) {
        const imageDir = path.join(appRootPath, 'image');
        if (fs.existsSync(imageDir)) {
          for (const file of fs.readdirSync(imageDir)) {
            const ext = path.extname(file).toLowerCase();
            const nameWithoutExt = file.replace(ext, '');
            if (nameWithoutExt === workId && ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
              fs.unlinkSync(path.join(imageDir, file));
            }
          }
        }
        const jsonPath = path.join(appRootPath, 'data', `${workId}.json`);
        if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
      } else if (imageFileName) {
        const imagePath = path.join(appRootPath, 'image', imageFileName);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        if (jsonFileName) {
          const jsonPath = path.join(appRootPath, 'data', jsonFileName);
          if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('delete-files error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('start-watch-works', async () => {
    try {
      const imagePath = path.join(getAppRootPath(), 'image');
      if (!fs.existsSync(imagePath)) {
        return { success: false, error: '图片目录不存在' };
      }

      if (fileWatcher) fileWatcher.close();

      fileWatcher = fs.watch(imagePath, { recursive: true }, (_eventType, filename) => {
        if (filename?.includes('info.json')) {
          const win = getMainWindow();
          if (win?.webContents) {
            win.webContents.send('works-changed');
          }
        }
      });

      return { success: true };
    } catch (error: any) {
      console.error('start-watch-works error:', error);
      return { success: false, error: error.message };
    }
  });
}

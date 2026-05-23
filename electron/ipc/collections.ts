import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { getAppRootPath, getImageURL, ensureDir, deleteFolderContent } from '../context.js';
import { closeFileWatcher, restartFileWatcher } from './works.js';

function updateNestedInfoFiles(dirPath: string, oldPrefix: string, newPrefix: string): void {
  for (const item of fs.readdirSync(dirPath)) {
    const itemPath = path.join(dirPath, item);
    if (!fs.statSync(itemPath).isDirectory()) continue;
    const infoPath = path.join(itemPath, 'info.json');
    if (fs.existsSync(infoPath)) {
      const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
      if (info.folder) {
        if (info.folder === oldPrefix) {
          info.folder = newPrefix;
        } else if (info.folder.startsWith(oldPrefix + '/')) {
          info.folder = newPrefix + '/' + info.folder.substring(oldPrefix.length + 1);
        }
      }
      if (info.images?.length > 0) {
        info.cover = getImageURL(`image/${info.folder}/${info.images[0]}`);
      }
      fs.writeFileSync(infoPath, JSON.stringify(info, null, 2), 'utf-8');
    }
    updateNestedInfoFiles(itemPath, oldPrefix, newPrefix);
  }
}

export function registerCollectionHandlers(): void {
  ipcMain.handle('create-folder', async (_event, folderName: string) => {
    try {
      const folderPath = path.join(getAppRootPath(), 'image', folderName);
      ensureDir(folderPath);
      return { success: true, path: folderPath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-collection', async (_event, folderName: string) => {
    try {
      const appRootPath = getAppRootPath();

      // Remove cover folder
      const coverFolderPath = path.join(appRootPath, 'image', 'collection_covers', folderName);
      if (fs.existsSync(coverFolderPath)) {
        deleteFolderContent(coverFolderPath);
        fs.rmdirSync(coverFolderPath);
      }

      // Remove image folder
      const imageFolderPath = path.join(appRootPath, 'image', folderName);
      if (fs.existsSync(imageFolderPath)) {
        deleteFolderContent(imageFolderPath);
        fs.rmdirSync(imageFolderPath);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('read-collections', async () => {
    try {
      const appRootPath = getAppRootPath();
      const imageDir = path.join(appRootPath, 'image');
      const collectionsFile = path.join(appRootPath, 'data', 'collections.json');

      if (!fs.existsSync(collectionsFile)) {
        return { success: true, data: { collections: [] } };
      }

      const raw = JSON.parse(fs.readFileSync(collectionsFile, 'utf-8'));
      let needSave = false;

      for (const collection of raw.collections || []) {
        // Migrate old cover paths
        if (collection.cover?.startsWith('file:///image/')) {
          const relativePath = collection.cover.substring(16);
          collection.cover = getImageURL(`image/${relativePath}`);
          needSave = true;
        }

        // Sync with disk
        const collectionFolder = collection.folder || `collection_${collection.id}`;
        const collectionPath = path.join(imageDir, collectionFolder);

        const diskWorks: string[] = [];
        if (fs.existsSync(collectionPath)) {
          for (const item of fs.readdirSync(collectionPath)) {
            const itemPath = path.join(collectionPath, item);
            if (fs.statSync(itemPath).isDirectory()) {
              const infoFile = path.join(itemPath, 'info.json');
              if (fs.existsSync(infoFile)) {
                diskWorks.push(`${collectionFolder}/${item}`);
              }
            }
          }
        }

        // Sort by timestamp
        diskWorks.sort((a, b) => {
          try {
            const infoA = JSON.parse(fs.readFileSync(path.join(imageDir, a, 'info.json'), 'utf-8'));
            const infoB = JSON.parse(fs.readFileSync(path.join(imageDir, b, 'info.json'), 'utf-8'));
            return (infoB.timestamp || infoB.createdAt?.timestamp || 0) -
                   (infoA.timestamp || infoA.createdAt?.timestamp || 0);
          } catch { return 0; }
        });

        if (JSON.stringify(collection.images) !== JSON.stringify(diskWorks)) {
          collection.images = diskWorks;
          needSave = true;
        }

        // Set cover from latest work if no custom cover
        const hasCustomCover = collection.cover && new RegExp(
          `^(file:///|pixium:///)image/collection_covers/${collection.folder}/cover\\.`
        ).test(collection.cover);

        if (!hasCustomCover && diskWorks.length > 0) {
          let latestWork: any = null;
          let latestTimestamp = 0;

          for (const workPath of diskWorks) {
            try {
              const infoFile = path.join(getAppRootPath(), 'image', workPath, 'info.json');
              if (fs.existsSync(infoFile)) {
                const workInfo = JSON.parse(fs.readFileSync(infoFile, 'utf-8'));
                const ts = workInfo.timestamp || workInfo.createdAt?.timestamp || 0;
                if (ts > latestTimestamp) {
                  latestTimestamp = ts;
                  latestWork = workInfo;
                }
              }
            } catch { /* skip */ }
          }

          if (latestWork) {
            let coverPath = latestWork.cover;
            if (!coverPath && latestWork.images?.length > 0 && latestWork.folder) {
              coverPath = getImageURL(`image/${latestWork.folder}/${latestWork.images[0]}`);
            }
            if (coverPath) collection.cover = coverPath;
          }
        } else if (!hasCustomCover && diskWorks.length === 0) {
          collection.cover = null;
        }
      }

      if (needSave) {
        fs.writeFileSync(collectionsFile, JSON.stringify(raw, null, 2), 'utf-8');
      }

      return { success: true, data: raw };
    } catch (error: any) {
      console.error('read-collections error:', error);
      return { success: false, error: error.message, data: { collections: [] } };
    }
  });

  ipcMain.handle('save-collections', async (_event, data: any) => {
    try {
      const dataDir = path.join(getAppRootPath(), 'data');
      ensureDir(dataDir);
      fs.writeFileSync(
        path.join(dataDir, 'collections.json'),
        JSON.stringify(data, null, 2),
        'utf-8'
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('rename-folder', async (_event, oldName: string, newName: string) => {
    try {
      const imageDir = path.join(getAppRootPath(), 'image');
      const oldPath = path.join(imageDir, oldName);
      const newPath = path.join(imageDir, newName);

      const oldExists = fs.existsSync(oldPath);
      const newExists = fs.existsSync(newPath);

      if (!oldExists && !newExists) {
        return { success: false, error: '文件夹不存在' };
      }
      if (oldExists && newExists) {
        return { success: false, error: '新文件夹已存在' };
      }
      if (oldName === newName) {
        return { success: true };
      }

      // Determine if it's a work or collection rename
      const isWorkRename =
        fs.existsSync(path.join(oldPath, 'info.json')) ||
        fs.existsSync(path.join(newPath, 'info.json'));

      // Rename folder if old path still exists (may have been renamed by a prior failed attempt)
      if (oldExists) {
        closeFileWatcher();
        try {
          fs.renameSync(oldPath, newPath);
        } finally {
          restartFileWatcher();
        }
      }

      // Update info.json metadata
      if (isWorkRename) {
        const infoPath = path.join(newPath, 'info.json');
        if (fs.existsSync(infoPath)) {
          const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
          info.folder = newName;
          if (info.images?.length > 0) {
            info.cover = getImageURL(`image/${newName}/${info.images[0]}`);
          }
          fs.writeFileSync(infoPath, JSON.stringify(info, null, 2), 'utf-8');
        }
      } else {
        // Collection: fix nested work info.json files
        updateNestedInfoFiles(newPath, oldName, newName);
      }

      // Update collections.json paths
      const collectionsFile = path.join(getAppRootPath(), 'data', 'collections.json');
      if (fs.existsSync(collectionsFile)) {
        const data = JSON.parse(fs.readFileSync(collectionsFile, 'utf-8'));
        const oldPrefix = oldName + '/';

        for (const c of data.collections) {
          if (c.folder === oldName) {
            c.folder = newName;
          }

          if (c.images) {
            c.images = c.images.map((img: string) => {
              if (img === oldName) return newName;
              if (img.startsWith(oldPrefix)) return newName + '/' + img.substring(oldPrefix.length);
              return img;
            });
          }

          if (c.cover) {
            if (c.cover === oldName) {
              c.cover = newName;
            } else if (c.cover.startsWith(oldPrefix)) {
              c.cover = newName + '/' + c.cover.substring(oldPrefix.length);
            }
          }
        }
        fs.writeFileSync(collectionsFile, JSON.stringify(data, null, 2), 'utf-8');
      }

      return { success: true };
    } catch (error: any) {
      console.error('rename-folder error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('move-work-folder', async (_event, workId: string, targetCollectionId: string) => {
    try {
      const appRootPath = getAppRootPath();
      const imageDir = path.join(appRootPath, 'image');
      const collectionsFile = path.join(appRootPath, 'data', 'collections.json');

      if (!fs.existsSync(collectionsFile)) {
        return { success: false, error: '收藏夹数据文件不存在' };
      }

      const data = JSON.parse(fs.readFileSync(collectionsFile, 'utf-8'));
      const targetCollection = data.collections.find((c: any) => c.id === targetCollectionId);
      if (!targetCollection) {
        return { success: false, error: '目标收藏夹不存在' };
      }

      const workBaseName = workId.split('/').pop()!;
      const currentCollection = data.collections.find((c: any) =>
        c.images?.some((img: string) => img === workId || img.split('/').pop() === workBaseName)
      );

      if (!currentCollection) {
        return { success: false, error: '作品不在任何收藏夹中' };
      }
      if (currentCollection.id === targetCollection.id) {
        return { success: true, message: '作品已在目标收藏夹中' };
      }

      const targetFolderName = targetCollection.folder || `collection_${targetCollection.id}`;
      const targetFolderPath = path.join(imageDir, targetFolderName);
      ensureDir(targetFolderPath);

      // Find work folder
      let workFolderPath = path.join(imageDir, workId);
      if (!fs.existsSync(workFolderPath)) {
        for (const item of fs.readdirSync(imageDir)) {
          const itemPath = path.join(imageDir, item);
          if (fs.statSync(itemPath).isDirectory()) {
            const nested = path.join(itemPath, workBaseName);
            if (fs.existsSync(nested)) { workFolderPath = nested; break; }
            if (item === workBaseName) { workFolderPath = itemPath; break; }
          }
        }
      }

      if (!fs.existsSync(workFolderPath)) {
        return { success: false, error: '作品文件夹不存在' };
      }

      const targetWorkPath = path.join(targetFolderPath, workBaseName);
      if (fs.existsSync(targetWorkPath)) {
        return { success: false, error: '目标位置已存在同名文件夹' };
      }

      // Move folder
      let workInfo: any = null;
      const sourceInfoPath = path.join(workFolderPath, 'info.json');
      if (fs.existsSync(sourceInfoPath)) {
        workInfo = JSON.parse(fs.readFileSync(sourceInfoPath, 'utf-8'));
      }

      closeFileWatcher();
      try {
        fs.renameSync(workFolderPath, targetWorkPath);
      } finally {
        restartFileWatcher();
      }

      // Update info.json in new location
      const newFolder = `${targetFolderName}/${workBaseName}`;
      const targetInfoPath = path.join(targetWorkPath, 'info.json');
      if (workInfo && fs.existsSync(targetInfoPath)) {
        const info = JSON.parse(fs.readFileSync(targetInfoPath, 'utf-8'));
        info.folder = newFolder;
        info.collectionId = targetCollection.id;
        if (info.images?.length > 0) {
          info.cover = getImageURL(`image/${newFolder}/${info.images[0]}`);
        }
        fs.writeFileSync(targetInfoPath, JSON.stringify(info, null, 2), 'utf-8');
      }

      // Update collections.json
      const newWorkId = newFolder;
      for (const c of data.collections) {
        if (c.id === currentCollection.id) {
          c.images = (c.images || []).filter((img: string) => img !== workId && img.split('/').pop() !== workBaseName);
        }
        if (c.id === targetCollection.id) {
          if (!c.images.some((img: string) => img === newWorkId || img.split('/').pop() === workBaseName)) {
            c.images.push(newWorkId);
          }
        }
      }

      fs.writeFileSync(collectionsFile, JSON.stringify(data, null, 2), 'utf-8');

      return {
        success: true,
        newWorkId,
        oldCollectionId: currentCollection.id,
        newCollectionId: targetCollection.id,
      };
    } catch (error: any) {
      console.error('move-work-folder error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('copy-work-folder', async (_event, workId: string, targetCollectionId: string) => {
    try {
      const appRootPath = getAppRootPath();
      const imageDir = path.join(appRootPath, 'image');
      const collectionsFile = path.join(appRootPath, 'data', 'collections.json');

      if (!fs.existsSync(collectionsFile)) {
        return { success: false, error: '收藏夹数据文件不存在' };
      }

      const data = JSON.parse(fs.readFileSync(collectionsFile, 'utf-8'));
      const targetCollection = data.collections.find((c: any) => c.id === targetCollectionId);
      if (!targetCollection) {
        return { success: false, error: '目标收藏夹不存在' };
      }

      const workBaseName = workId.split('/').pop()!;

      let workFolderPath = path.join(imageDir, workId);
      if (!fs.existsSync(workFolderPath)) {
        for (const item of fs.readdirSync(imageDir)) {
          if (item === 'collection_covers') continue;
          const itemPath = path.join(imageDir, item);
          if (!fs.statSync(itemPath).isDirectory()) continue;
          const nestedPath = path.join(itemPath, workBaseName);
          if (fs.existsSync(nestedPath)) { workFolderPath = nestedPath; break; }
        }
      }

      if (!fs.existsSync(workFolderPath)) {
        return { success: false, error: '作品文件夹不存在' };
      }

      const targetFolderName = targetCollection.folder || `collection_${targetCollection.id}`;
      const targetFolderPath = path.join(imageDir, targetFolderName);
      ensureDir(targetFolderPath);

      const targetWorkPath = path.join(targetFolderPath, workBaseName);
      if (fs.existsSync(targetWorkPath)) {
        return { success: false, error: '目标位置已存在同名文件夹' };
      }

      fs.cpSync(workFolderPath, targetWorkPath, { recursive: true });

      const newFolder = `${targetFolderName}/${workBaseName}`;
      const targetInfoPath = path.join(targetWorkPath, 'info.json');
      if (fs.existsSync(targetInfoPath)) {
        const info = JSON.parse(fs.readFileSync(targetInfoPath, 'utf-8'));
        info.folder = newFolder;
        info.collectionId = targetCollection.id;
        if (info.images?.length > 0) {
          info.cover = getImageURL(`image/${newFolder}/${info.images[0]}`);
        }
        fs.writeFileSync(targetInfoPath, JSON.stringify(info, null, 2), 'utf-8');
      }

      const newWorkId = newFolder;
      for (const c of data.collections) {
        if (c.id === targetCollection.id) {
          if (!c.images.some((img: string) => img === newWorkId || img.split('/').pop() === workBaseName)) {
            c.images.push(newWorkId);
          }
        }
      }

      fs.writeFileSync(collectionsFile, JSON.stringify(data, null, 2), 'utf-8');

      return { success: true, newWorkId };
    } catch (error: any) {
      console.error('copy-work-folder error:', error);
      return { success: false, error: error.message };
    }
  });
}

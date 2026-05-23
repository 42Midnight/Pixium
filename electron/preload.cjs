const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveImage: (fileName, bufferArray) =>
    ipcRenderer.invoke('save-image', fileName, bufferArray),

  createFolder: (folderName) =>
    ipcRenderer.invoke('create-folder', folderName),

  deleteFiles: (workId, imageFileName, jsonFileName) =>
    ipcRenderer.invoke('delete-files', workId, imageFileName, jsonFileName),

  deleteFile: (filePath) =>
    ipcRenderer.invoke('delete-file', filePath),

  deleteCollection: (folderName) =>
    ipcRenderer.invoke('delete-collection', folderName),

  readWorks: () =>
    ipcRenderer.invoke('read-works'),

  readCollections: () =>
    ipcRenderer.invoke('read-collections'),

  saveCollections: (data) =>
    ipcRenderer.invoke('save-collections', data),

  renameFolder: (oldName, newName) =>
    ipcRenderer.invoke('rename-folder', oldName, newName),

  moveWorkFolder: (workId, targetCollectionId) =>
    ipcRenderer.invoke('move-work-folder', workId, targetCollectionId),

  copyWorkFolder: (workId, targetCollectionId) =>
    ipcRenderer.invoke('copy-work-folder', workId, targetCollectionId),

  readWorkDetail: (fileName) =>
    ipcRenderer.invoke('read-work-detail', fileName),

  loadTemplates: () =>
    ipcRenderer.invoke('load-templates'),

  saveTemplates: (templates) =>
    ipcRenderer.invoke('save-templates', templates),

  readSettings: () =>
    ipcRenderer.invoke('read-settings'),

  saveSettings: (settings) =>
    ipcRenderer.invoke('save-settings', settings),

  startWatchWorks: () =>
    ipcRenderer.invoke('start-watch-works'),

  onWorksChanged: (callback) => {
    ipcRenderer.on('works-changed', callback);
    return () => ipcRenderer.removeListener('works-changed', callback);
  },

  selectFolder: () =>
    ipcRenderer.invoke('select-folder'),

  downloadImage: (workId, targetPath) =>
    ipcRenderer.invoke('download-image', workId, targetPath),

  downloadCollectionImages: (collectionFolder, targetPath, imagePaths) =>
    ipcRenderer.invoke('download-collection-images', collectionFolder, targetPath, imagePaths),

  saveImageAs: (imagePath) =>
    ipcRenderer.invoke('save-image-as', imagePath),

  downloadSingleImage: (imagePath, targetPath, fileName) =>
    ipcRenderer.invoke('download-single-image', imagePath, targetPath, fileName),

  getImageURL: (relativePath) =>
    ipcRenderer.invoke('get-image-url', relativePath),

  toggleAlwaysOnTop: () =>
    ipcRenderer.invoke('toggle-always-on-top'),

  getAlwaysOnTop: () =>
    ipcRenderer.invoke('get-always-on-top'),

  winMinimize: () => ipcRenderer.invoke('win-minimize'),
  winMaximize: () => ipcRenderer.invoke('win-maximize'),
  winClose: () => ipcRenderer.invoke('win-close'),
  winIsMaximized: () => ipcRenderer.invoke('win-is-maximized'),
  onWindowStateChanged: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('window-state-changed', handler);
    return () => ipcRenderer.removeListener('window-state-changed', handler);
  },
});

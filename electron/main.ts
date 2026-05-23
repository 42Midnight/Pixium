import { app, BrowserWindow, protocol } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { setMainWindow, getAppRootPath, ensureDir } from './context.js';
import { registerAllHandlers } from './ipc/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

function registerImageProtocol(): void {
  protocol.registerFileProtocol('pixium', (request, callback) => {
    let url = request.url.replace('pixium:///', '').replace('pixium://', '');
    url = decodeURIComponent(url);
    const filePath = path.join(getAppRootPath(), url);
    callback({ path: filePath });
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  setMainWindow(mainWindow);

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-state-changed', { maximized: true });
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-state-changed', { maximized: false });
  });
  mainWindow.on('closed', () => app.quit());
}

function initializeAppDirectories(): void {
  const root = getAppRootPath();
  ensureDir(path.join(root, 'image'));
  ensureDir(path.join(root, 'data'));
  ensureDir(path.join(root, 'image', 'collection_covers'));
}

app.whenReady().then(() => {
  initializeAppDirectories();
  registerImageProtocol();
  registerAllHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

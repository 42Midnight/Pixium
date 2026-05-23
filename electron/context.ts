import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

export function setMainWindow(win: BrowserWindow) {
  mainWindow = win;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function getAppRootPath(): string {
  const isForcedPackaged =
    process.env.FORCE_PACKAGED_MODE === 'true' ||
    process.env.FORCE_PACKAGED_MODE === '1';

  if (app.isPackaged || isForcedPackaged) {
    return app.getPath('userData');
  }
  return path.join(app.getAppPath());
}

export function getImageURL(relativePath: string): string {
  if (app.isPackaged || process.env.FORCE_PACKAGED_MODE === 'true') {
    return `pixium:///${relativePath}`;
  }
  const appRoot = getAppRootPath();
  const fullPath = path.join(appRoot, relativePath).replace(/\\/g, '/');
  return `file:///${fullPath}`;
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function deleteFolderContent(folderPath: string): void {
  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) return;

  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    if (fs.statSync(filePath).isFile()) {
      fs.unlinkSync(filePath);
    } else if (fs.statSync(filePath).isDirectory()) {
      deleteFolderContent(filePath);
      fs.rmdirSync(filePath);
    }
  }
}

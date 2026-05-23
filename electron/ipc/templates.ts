import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { getAppRootPath, ensureDir } from '../context.js';

export function registerTemplateHandlers(): void {
  ipcMain.handle('load-templates', async () => {
    try {
      const templatesFile = path.join(getAppRootPath(), 'data', 'templates.json');
      if (!fs.existsSync(templatesFile)) {
        ensureDir(path.dirname(templatesFile));
        fs.writeFileSync(templatesFile, JSON.stringify([], null, 2), 'utf-8');
        return { success: true, data: [] };
      }
      return { success: true, data: JSON.parse(fs.readFileSync(templatesFile, 'utf-8')) };
    } catch (error: any) {
      console.error('load-templates error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('save-templates', async (_event, templates: any) => {
    try {
      const dataDir = path.join(getAppRootPath(), 'data');
      ensureDir(dataDir);
      fs.writeFileSync(path.join(dataDir, 'templates.json'), JSON.stringify(templates, null, 2), 'utf-8');
      return { success: true };
    } catch (error: any) {
      console.error('save-templates error:', error);
      return { success: false, error: error.message };
    }
  });
}

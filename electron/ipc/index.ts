import { registerImageHandlers } from './images.js';
import { registerCollectionHandlers } from './collections.js';
import { registerWorkHandlers } from './works.js';
import { registerTemplateHandlers } from './templates.js';
import { registerSettingsHandlers } from './settings.js';

export function registerAllHandlers(): void {
  registerImageHandlers();
  registerCollectionHandlers();
  registerWorkHandlers();
  registerTemplateHandlers();
  registerSettingsHandlers();
}

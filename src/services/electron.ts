import type { ElectronAPI } from '../types';

export function getElectronAPI(): ElectronAPI | undefined {
  return window.electronAPI;
}

export function requireElectronAPI(): ElectronAPI {
  if (!window.electronAPI) {
    throw new Error('Electron API not available');
  }
  return window.electronAPI;
}

export function isElectronAvailable(): boolean {
  return !!window.electronAPI;
}

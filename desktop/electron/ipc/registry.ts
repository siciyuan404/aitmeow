import { ipcMain } from 'electron';
import { registerConnectionHandlers } from './handlers/connection';
import { registerSettingsHandlers } from './handlers/settings';

export function registerIpcHandlers() {
  registerConnectionHandlers();
  registerSettingsHandlers();
}

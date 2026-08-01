import { ipcMain, BrowserWindow } from 'electron';
import { registerConnectionHandlers } from './handlers/connection';
import { registerSettingsHandlers } from './handlers/settings';
import { registerUpdateHandlers } from './handlers/update';

export function registerIpcHandlers() {
  registerConnectionHandlers();
  registerSettingsHandlers();
  registerUpdateHandlers();

  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.handle('window:isMaximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
  });
}

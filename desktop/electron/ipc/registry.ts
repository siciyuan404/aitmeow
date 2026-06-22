import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import { registerConnectionHandlers } from './handlers/connection';
import { registerSettingsHandlers } from './handlers/settings';
import { registerUpdateHandlers } from './handlers/update';

let settingsWindow: BrowserWindow | null = null;

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

  ipcMain.handle('window:openSettings', (event) => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.focus();
      return;
    }
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    const winUrl = mainWindow?.getURL() || '';
    const baseUrl = winUrl.split('#')[0];

    settingsWindow = new BrowserWindow({
      width: 700,
      height: 600,
      minWidth: 520,
      minHeight: 480,
      title: '设置 - aitmeow',
      frame: true,
      resizable: true,
      parent: mainWindow ?? undefined,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    settingsWindow.setMenuBarVisibility(false);
    settingsWindow.loadURL(baseUrl + '#/settings');

    settingsWindow.on('closed', () => {
      settingsWindow = null;
      // 通知主窗口重新加载设置
      mainWindow?.webContents.send('settings:reload');
    });
  });
}

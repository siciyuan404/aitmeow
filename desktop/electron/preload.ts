import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  connectionStart: (port: number) => ipcRenderer.invoke('connection:start', port),
  connectionStop: () => ipcRenderer.invoke('connection:stop'),
  connectionStatus: () => ipcRenderer.invoke('connection:status'),

  settingsGet: (key: string) => ipcRenderer.invoke('settings:get', key),
  settingsSet: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),

  updateGetStatus: () => ipcRenderer.invoke('update:getStatus'),
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateOpenRelease: (releaseUrl?: string) => ipcRenderer.invoke('update:openRelease', releaseUrl),
  updateOpenDownload: (assetUrl?: string) => ipcRenderer.invoke('update:openDownload', assetUrl),

  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  windowOpenSettings: () => ipcRenderer.invoke('window:openSettings'),

  onConnectionLog: (callback: (message: string) => void) => {
    const handler = (_event: IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on('connection:log', handler);
    return () => ipcRenderer.removeListener('connection:log', handler);
  },

  onConnectionStatus: (callback: (status: { running: boolean; port: number }) => void) => {
    const handler = (_event: IpcRendererEvent, status: { running: boolean; port: number }) => callback(status);
    ipcRenderer.on('connection:status-changed', handler);
    return () => ipcRenderer.removeListener('connection:status-changed', handler);
  },

  onSettingsReload: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('settings:reload', handler);
    return () => ipcRenderer.removeListener('settings:reload', handler);
  },
});

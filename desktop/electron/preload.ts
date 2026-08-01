import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  connectionStart: (port: number) => ipcRenderer.invoke('connection:start', port),
  connectionStop: () => ipcRenderer.invoke('connection:stop'),
  connectionStatus: () => ipcRenderer.invoke('connection:status'),

  settingsGet: (key: string) => ipcRenderer.invoke('settings:get', key),
  settingsSet: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),

  updateGetState: () => ipcRenderer.invoke('update:getState'),
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateDownload: () => ipcRenderer.invoke('update:download'),
  updateInstall: () => ipcRenderer.invoke('update:install'),

  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:isMaximized'),

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

  onUpdateStateChanged: (callback: (state: unknown) => void) => {
    const handler = (_event: IpcRendererEvent, state: unknown) => callback(state);
    ipcRenderer.on('update:state-changed', handler);
    return () => ipcRenderer.removeListener('update:state-changed', handler);
  },
});

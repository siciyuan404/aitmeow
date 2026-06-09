interface ElectronAPI {
  connectionStart: (port: number) => Promise<{ success: boolean; port?: number; error?: string }>;
  connectionStop: () => Promise<{ success: boolean; error?: string }>;
  connectionStatus: () => Promise<{ running: boolean; port: number }>;
  settingsGet: (key: string) => Promise<unknown>;
  settingsSet: (key: string, value: unknown) => Promise<{ success: boolean }>;
  onConnectionLog: (callback: (message: string) => void) => () => void;
  onConnectionStatus: (callback: (status: { running: boolean; port: number }) => void) => () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}

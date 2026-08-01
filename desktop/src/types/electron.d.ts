type ElectronSettingsValues = {
  port?: number;
  dbPath?: string;
  theme?: 'dark' | 'light' | 'system';
  uiLocatorEnabled?: boolean;
  [key: string]: unknown;
};

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'ready'
  | 'error';

interface UpdateState {
  seq: number;
  status: UpdateStatus;
  currentVersion: string;
  isPackaged: boolean;
  info?: {
    version: string;
    releaseName?: string;
    releaseNotes?: string;
    releaseDate?: string;
  };
  progress?: {
    percent: number;
    transferred: number;
    total: number;
    bytesPerSecond: number;
  };
  error?: string;
}

interface ElectronAPI {
  connectionStart: (port: number) => Promise<{ success: boolean; port?: number; error?: string }>;
  connectionStop: () => Promise<{ success: boolean; error?: string }>;
  connectionStatus: () => Promise<{ running: boolean; port: number }>;
  settingsGet: (key: string) => Promise<unknown>;
  settingsSet: (key: string, value: unknown) => Promise<{ success: boolean }>;
  settingsSetAll?: (values: ElectronSettingsValues) => Promise<{ success: boolean }>;
  onConnectionLog: (callback: (message: string) => void) => () => void;
  onConnectionStatus: (callback: (status: { running: boolean; port: number }) => void) => () => void;
  updateGetState: () => Promise<UpdateState>;
  updateCheck: () => Promise<{ success: boolean; error?: string }>;
  updateDownload: () => Promise<{ success: boolean; error?: string }>;
  updateInstall: () => Promise<{ success: boolean; error?: string }>;
  onUpdateStateChanged: (callback: (state: UpdateState) => void) => () => void;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
}

interface Window {
  electronAPI?: ElectronAPI;
}

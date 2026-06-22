type ElectronUpdateStatus = {
  currentVersion: string;
  repository: string;
  releasesUrl: string;
  platform: string;
  arch: string;
  expectedAssetName: string;
};

type ElectronUpdateCheckResult = ElectronUpdateStatus & {
  latestVersion: string | null;
  latestTag: string | null;
  updateAvailable: boolean;
  releaseName?: string;
  releaseUrl?: string;
  releaseNotes?: string | null;
  publishedAt?: string | null;
  assetName?: string;
  assetUrl?: string;
  assetSize?: number;
};

interface ElectronAPI {
  connectionStart: (port: number) => Promise<{ success: boolean; port?: number; error?: string }>;
  connectionStop: () => Promise<{ success: boolean; error?: string }>;
  connectionStatus: () => Promise<{ running: boolean; port: number }>;
  settingsGet: (key: string) => Promise<unknown>;
  settingsSet: (key: string, value: unknown) => Promise<{ success: boolean }>;
  updateGetStatus: () => Promise<ElectronUpdateStatus>;
  updateCheck: () => Promise<ElectronUpdateCheckResult>;
  updateOpenRelease: (releaseUrl?: string) => Promise<{ success: boolean; url: string }>;
  updateOpenDownload: (assetUrl?: string) => Promise<{ success: boolean; url: string }>;
  onConnectionLog: (callback: (message: string) => void) => () => void;
  onConnectionStatus: (callback: (status: { running: boolean; port: number }) => void) => () => void;
  onSettingsReload: (callback: () => void) => () => void;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  windowOpenSettings: () => Promise<void>;
}

interface Window {
  electronAPI?: ElectronAPI;
}

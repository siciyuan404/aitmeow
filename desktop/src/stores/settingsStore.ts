import { create } from 'zustand';

export type AppTheme = 'dark' | 'light' | 'system';

export interface SettingsSnapshot {
  port: number;
  dbPath: string;
  theme: AppTheme;
  uiLocatorEnabled: boolean;
}

interface SettingsState {
  port: number;
  dbPath: string;
  theme: AppTheme;
  uiLocatorEnabled: boolean;
  loaded: boolean;
}

interface SettingsActions {
  setPort: (port: number) => void;
  setDbPath: (path: string) => void;
  setTheme: (theme: AppTheme) => void;
  setUiLocatorEnabled: (enabled: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: (settings?: Partial<SettingsSnapshot>) => Promise<void>;
}

type SettingsStore = SettingsState & SettingsActions;

const defaultSettings: SettingsSnapshot = {
  port: 8765,
  dbPath: '',
  theme: 'light',
  uiLocatorEnabled: false,
};

function normalizePort(value: unknown): number {
  const port = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return defaultSettings.port;
  }
  return port;
}

function normalizeTheme(value: unknown): AppTheme {
  return value === 'dark' || value === 'light' || value === 'system'
    ? value
    : defaultSettings.theme;
}

function normalizeBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false;
}

function applyTheme(theme: AppTheme) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('light', !isDark);
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...defaultSettings,
  loaded: false,

  setPort: (port) => set({ port }),
  setDbPath: (dbPath) => set({ dbPath }),
  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
  },
  setUiLocatorEnabled: async (uiLocatorEnabled) => {
    const previous = get().uiLocatorEnabled;
    set({ uiLocatorEnabled });

    try {
      if (window.electronAPI) {
        await window.electronAPI.settingsSet('uiLocatorEnabled', uiLocatorEnabled);
      }
    } catch (err) {
      set({ uiLocatorEnabled: previous });
      throw err;
    }
  },

  loadSettings: async () => {
    if (window.electronAPI) {
      const [port, dbPath, theme, uiLocatorEnabled] = await Promise.all([
        window.electronAPI.settingsGet('port'),
        window.electronAPI.settingsGet('dbPath'),
        window.electronAPI.settingsGet('theme'),
        window.electronAPI.settingsGet('uiLocatorEnabled'),
      ]);
      const next = {
        port: normalizePort(port),
        dbPath: typeof dbPath === 'string' ? dbPath : defaultSettings.dbPath,
        theme: normalizeTheme(theme),
        uiLocatorEnabled: normalizeBoolean(uiLocatorEnabled),
        loaded: true,
      };

      applyTheme(next.theme);
      set(next);
    } else {
      applyTheme(defaultSettings.theme);
      set({ ...defaultSettings, loaded: true });
    }
  },

  saveSettings: async (settings) => {
    const current = get();
    const next: SettingsSnapshot = {
      port: normalizePort(settings?.port ?? current.port),
      dbPath: settings?.dbPath ?? current.dbPath,
      theme: normalizeTheme(settings?.theme ?? current.theme),
      uiLocatorEnabled: normalizeBoolean(settings?.uiLocatorEnabled ?? current.uiLocatorEnabled),
    };

    if (window.electronAPI) {
      if (window.electronAPI.settingsSetAll) {
        await window.electronAPI.settingsSetAll({ ...next });
      } else {
        await window.electronAPI.settingsSet('port', next.port);
        await window.electronAPI.settingsSet('dbPath', next.dbPath);
        await window.electronAPI.settingsSet('theme', next.theme);
        await window.electronAPI.settingsSet('uiLocatorEnabled', next.uiLocatorEnabled);
      }
    }

    set({ ...next, loaded: true });
    applyTheme(next.theme);
  },
}));

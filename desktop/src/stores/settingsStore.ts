import { create } from 'zustand';

interface SettingsState {
  port: number;
  dbPath: string;
  theme: 'dark' | 'light' | 'system';
  uiLocatorEnabled: boolean;
  loaded: boolean;
}

interface SettingsActions {
  setPort: (port: number) => void;
  setDbPath: (path: string) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setUiLocatorEnabled: (enabled: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  port: 8765,
  dbPath: '',
  theme: 'dark',
  uiLocatorEnabled: false,
  loaded: false,

  setPort: (port) => set({ port }),
  setDbPath: (dbPath) => set({ dbPath }),
  setTheme: (theme) => {
    set({ theme });
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
  },

  setUiLocatorEnabled: async (enabled) => {
    set({ uiLocatorEnabled: enabled });
    if (window.electronAPI) {
      try {
        await window.electronAPI.settingsSet('uiLocatorEnabled', enabled);
      } catch {
        set({ uiLocatorEnabled: !enabled });
        throw new Error('保存 UI 定位设置失败');
      }
    }
  },

  loadSettings: async () => {
    if (window.electronAPI) {
      const port = (await window.electronAPI.settingsGet('port')) as number;
      const dbPath = (await window.electronAPI.settingsGet('dbPath')) as string;
      const theme = (await window.electronAPI.settingsGet('theme')) as 'dark' | 'light' | 'system';
      const uiLocatorEnabled = (await window.electronAPI.settingsGet('uiLocatorEnabled')) as boolean;
      const resolvedTheme = (theme || 'dark') as 'dark' | 'light' | 'system';
      set({ port: port || 8765, dbPath: dbPath || '', theme: resolvedTheme, uiLocatorEnabled: !!uiLocatorEnabled, loaded: true });
      // 启动时应用主题 CSS 类
      get().setTheme(resolvedTheme);
    } else {
      set({ port: 8765, dbPath: '', theme: 'dark', uiLocatorEnabled: false, loaded: true });
      get().setTheme('dark');
    }
  },

  saveSettings: async () => {
    const { port, dbPath, theme, uiLocatorEnabled } = get();
    if (window.electronAPI) {
      await window.electronAPI.settingsSet('port', port);
      await window.electronAPI.settingsSet('dbPath', dbPath);
      await window.electronAPI.settingsSet('theme', theme);
      await window.electronAPI.settingsSet('uiLocatorEnabled', uiLocatorEnabled);
    }
  },
}));

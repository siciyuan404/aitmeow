import { create } from 'zustand';

interface SettingsState {
  port: number;
  dbPath: string;
  theme: 'dark' | 'light';
  loaded: boolean;
}

interface SettingsActions {
  setPort: (port: number) => void;
  setDbPath: (path: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  port: 8765,
  dbPath: '',
  theme: 'dark',
  loaded: false,

  setPort: (port) => set({ port }),
  setDbPath: (dbPath) => set({ dbPath }),
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  },

  loadSettings: async () => {
    if (window.electronAPI) {
      const port = (await window.electronAPI.settingsGet('port')) as number;
      const dbPath = (await window.electronAPI.settingsGet('dbPath')) as string;
      const theme = (await window.electronAPI.settingsGet('theme')) as 'dark' | 'light';
      set({ port: port || 8765, dbPath: dbPath || '', theme: theme || 'dark', loaded: true });
    } else {
      set({ port: 8765, dbPath: '', theme: 'dark', loaded: true });
    }
  },

  saveSettings: async () => {
    const { port, dbPath, theme } = get();
    if (window.electronAPI) {
      await window.electronAPI.settingsSet('port', port);
      await window.electronAPI.settingsSet('dbPath', dbPath);
      await window.electronAPI.settingsSet('theme', theme);
    }
  },
}));

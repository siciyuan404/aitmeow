import { ipcMain } from 'electron';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { app } from 'electron';

interface Settings {
  port: number;
  dbPath: string;
  theme: 'dark' | 'light';
  [key: string]: unknown;
}

const defaultSettings: Settings = {
  port: 8765,
  dbPath: path.join(app.getPath('userData'), 'aitmeow.db'),
  theme: 'dark',
};

function getSettingsPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'settings.json');
}

function loadSettings(): Settings {
  const settingsPath = getSettingsPath();
  if (!existsSync(settingsPath)) {
    return { ...defaultSettings };
  }
  try {
    const data = readFileSync(settingsPath, 'utf-8');
    return { ...defaultSettings, ...JSON.parse(data) };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings(settings: Settings): void {
  const settingsPath = getSettingsPath();
  const dir = path.dirname(settingsPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

export function registerSettingsHandlers() {
  ipcMain.handle('settings:get', async (_event, key: string) => {
    const settings = loadSettings();
    if (key) {
      return settings[key];
    }
    return settings;
  });

  ipcMain.handle('settings:set', async (_event, key: string, value: unknown) => {
    const settings = loadSettings();
    settings[key] = value;
    saveSettings(settings);
    return { success: true };
  });
}

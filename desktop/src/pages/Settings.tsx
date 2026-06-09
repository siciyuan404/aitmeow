import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSettingsStore } from '@/stores/settingsStore';

export default function SettingsPage() {
  const { port, dbPath, theme, loaded, setPort, setDbPath, setTheme, loadSettings, saveSettings } = useSettingsStore();
  const [portInput, setPortInput] = useState(String(port));
  const [dbPathInput, setDbPathInput] = useState(dbPath);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    setPortInput(String(port));
    setDbPathInput(dbPath);
  }, [port, dbPath]);

  const handleSave = async () => {
    const portNum = parseInt(portInput, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      toast.error('Invalid port number');
      return;
    }
    setPort(portNum);
    setDbPath(dbPathInput);
    await saveSettings();
    toast.success('Settings saved');
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your AI Tmeow server</p>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 space-y-4">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Server</h2>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Port</label>
          <input
            type="number"
            value={portInput}
            onChange={(e) => setPortInput(e.target.value)}
            min={1}
            max={65535}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Database Path</label>
          <input
            type="text"
            value={dbPathInput}
            onChange={(e) => setDbPathInput(e.target.value)}
            placeholder="/path/to/aitmeow.db"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 space-y-4">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Appearance</h2>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Theme</label>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                theme === 'dark'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                theme === 'light'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              Light
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 space-y-2">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">About</h2>
        <p className="text-sm text-gray-400">AI Tmeow Desktop v0.1.0</p>
        <p className="text-sm text-gray-500">Electron + React + TypeScript + Vite + Tailwind</p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}

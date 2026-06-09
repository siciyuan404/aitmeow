import { useEffect, useCallback } from 'react';
import { useConnectionStore } from '@/stores/connectionStore';

export function useConnection() {
  const store = useConnectionStore();

  useEffect(() => {
    if (window.electronAPI) {
      const cleanupLog = window.electronAPI.onConnectionLog((message) => {
        store.addLog(message);
      });
      const cleanupStatus = window.electronAPI.onConnectionStatus((status) => {
        store.setConnected(status.running);
      });
      return () => {
        cleanupLog?.();
        cleanupStatus?.();
      };
    }
  }, []);

  const start = useCallback(async (port: number) => {
    store.setConnecting(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.connectionStart(port);
        if (result.success) {
          store.setPort(port);
          store.setConnected(true);
        }
        return result;
      }
      return { success: false, error: 'No Electron API' };
    } finally {
      store.setConnecting(false);
    }
  }, []);

  const stop = useCallback(async () => {
    store.setConnecting(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.connectionStop();
        if (result.success) {
          store.setConnected(false);
        }
        return result;
      }
      return { success: false, error: 'No Electron API' };
    } finally {
      store.setConnecting(false);
    }
  }, []);

  return { ...store, start, stop };
}

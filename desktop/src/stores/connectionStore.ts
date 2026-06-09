import { create } from 'zustand';

interface ConnectionState {
  port: number;
  connected: boolean;
  connecting: boolean;
  logs: string[];
}

interface ConnectionActions {
  setPort: (port: number) => void;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  addLog: (message: string) => void;
  clearLogs: () => void;
}

type ConnectionStore = ConnectionState & ConnectionActions;

export const useConnectionStore = create<ConnectionStore>((set) => ({
  port: 8765,
  connected: false,
  connecting: false,
  logs: [],

  setPort: (port) => set({ port }),
  setConnected: (connected) => set({ connected }),
  setConnecting: (connecting) => set({ connecting }),
  addLog: (message) => set((state) => ({ logs: [...state.logs, message] })),
  clearLogs: () => set({ logs: [] }),
}));

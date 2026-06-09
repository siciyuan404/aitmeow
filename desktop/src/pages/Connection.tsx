import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import StatusIndicator from '@/components/common/StatusIndicator';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useConnectionStore } from '@/stores/connectionStore';

export default function ConnectionPage() {
  const { port, connected, connecting, logs, setPort, setConnected, setConnecting, addLog, clearLogs } = useConnectionStore();
  const [inputPort, setInputPort] = useState(String(port));
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStart = async () => {
    const portNum = parseInt(inputPort, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      toast.error('Invalid port number');
      return;
    }

    setConnecting(true);
    addLog(`Starting server on port ${portNum}...`);

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.connectionStart(portNum);
        if (result.success) {
          setPort(portNum);
          setConnected(true);
          addLog(`Server started successfully on port ${portNum}`);
          toast.success('Server started');
        } else {
          addLog(`Error: ${result.error}`);
          toast.error(result.error);
        }
      } else {
        await new Promise((r) => setTimeout(r, 1000));
        setPort(portNum);
        setConnected(true);
        addLog(`Server started on port ${portNum} (simulated)`);
        toast.success('Server started (simulated)');
      }
    } catch (err) {
      addLog(`Error: ${String(err)}`);
      toast.error(String(err));
    } finally {
      setConnecting(false);
    }
  };

  const handleStop = async () => {
    setConnecting(true);
    addLog('Stopping server...');

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.connectionStop();
        if (result.success) {
          setConnected(false);
          addLog('Server stopped');
          toast.success('Server stopped');
        } else {
          addLog(`Error: ${result.error}`);
          toast.error(result.error);
        }
      } else {
        await new Promise((r) => setTimeout(r, 500));
        setConnected(false);
        addLog('Server stopped (simulated)');
        toast.success('Server stopped (simulated)');
      }
    } catch (err) {
      addLog(`Error: ${String(err)}`);
      toast.error(String(err));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Connection Management</h1>
        <p className="text-sm text-gray-500 mt-1">Start and stop the AI Tmeow server</p>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIndicator
              status={connected ? 'connected' : connecting ? 'connecting' : 'disconnected'}
              size="lg"
            />
            <div>
              <p className="font-medium text-gray-200">
                {connected ? 'Connected' : connecting ? 'Connecting...' : 'Disconnected'}
              </p>
              {connected && (
                <p className="text-sm text-gray-500">Port: {port}</p>
              )}
            </div>
          </div>

          {connecting && <LoadingSpinner size="sm" />}
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 space-y-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-400 mb-1">Port</label>
            <input
              type="number"
              value={inputPort}
              onChange={(e) => setInputPort(e.target.value)}
              min={1}
              max={65535}
              disabled={connected || connecting}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleStart}
            disabled={connected || connecting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Start
          </button>
          <button
            onClick={handleStop}
            disabled={!connected || connecting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Stop
          </button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-medium text-gray-400">Server Logs</h2>
          <button
            onClick={clearLogs}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        </div>
        <div className="h-48 overflow-y-auto p-4 font-mono text-xs space-y-1">
          {logs.length === 0 ? (
            <p className="text-gray-600 italic">No logs yet. Start the server to see output.</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="text-gray-400">
                <span className="text-gray-600">[{i + 1}]</span> {log}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}

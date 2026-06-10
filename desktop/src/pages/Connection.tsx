import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import StatusIndicator from '@/components/common/StatusIndicator';
import { useConnectionStore } from '@/stores/connectionStore';
import { api } from '@/services/api';
import { wsClient } from '@/services/ws';

export default function ConnectionPage() {
  const { port, connected, connecting, logs, setPort, setConnected, setConnecting, addLog, clearLogs } =
    useConnectionStore();
  const [inputPort, setInputPort] = useState(String(port));
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [mcpCopied, setMcpCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(async () => {
      try {
        const h = await api.health();
        setHealthStatus(h.status);
      } catch {
        setHealthStatus('disconnected');
        setConnected(false);
        addLog('Lost connection to server');
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [connected]);

  const handleStart = async () => {
    const portNum = parseInt(inputPort, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      toast.error('Invalid port number');
      return;
    }

    setConnecting(true);
    addLog(`Starting aitmeow server on port ${portNum}...`);

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.connectionStart(portNum);
        if (result.success) {
          onStarted(portNum);
        } else {
          addLog(`Error: ${result.error}`);
          toast.error(result.error);
        }
      } else {
        await new Promise((r) => setTimeout(r, 800));
        const ok = await checkHealth(portNum);
        if (ok) {
          onStarted(portNum);
        } else {
          addLog(`Cannot reach server on port ${portNum}`);
          toast.error('Server not reachable');
        }
      }
    } catch (err: any) {
      addLog(`Error: ${err.message || err}`);
      toast.error(String(err));
    } finally {
      setConnecting(false);
    }
  };

  const onStarted = (portNum: number) => {
    setPort(portNum);
    setConnected(true);
    setHealthStatus('ok');
    wsClient.connect(portNum);
    (window as any).__AITMEOW_PORT__ = portNum;
    addLog(`Server ready on port ${portNum}`);
    toast.success('Server started');
  };

  const handleStop = async () => {
    setConnecting(true);
    addLog('Stopping server...');
    try {
      wsClient.disconnect();
      if (window.electronAPI) {
        await window.electronAPI.connectionStop();
      }
      setConnected(false);
      setHealthStatus(null);
      addLog('Server stopped');
      toast.success('Server stopped');
    } catch (err: any) {
      addLog(`Error: ${err.message || err}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleCopyMcp = () => {
    const config = JSON.stringify(
      {
        mcpServers: {
          aitmeow: {
            url: `http://127.0.0.1:${port}/mcp`,
          },
        },
      },
      null,
      2,
    );
    navigator.clipboard.writeText(config);
    setMcpCopied(true);
    toast.success('MCP config copied');
    setTimeout(() => setMcpCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Connection</h1>
        <p className="text-sm text-gray-500 mt-1">Manage the aitmeow server</p>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusIndicator
            status={connected ? (healthStatus === 'ok' ? 'connected' : 'connecting') : connecting ? 'connecting' : 'disconnected'}
            size="lg"
          />
          <div>
            <p className="font-medium text-gray-200">
              {connected ? (healthStatus === 'ok' ? 'Running' : 'Unhealthy') : connecting ? 'Starting...' : 'Stopped'}
            </p>
            {connected && (
              <p className="text-xs text-gray-500">
                Port {port} &middot; {healthStatus ?? 'checking...'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Port</label>
            <input
              type="number"
              value={inputPort}
              onChange={(e) => setInputPort(e.target.value)}
              min={1}
              max={65535}
              disabled={connected || connecting}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleStart}
            disabled={connected || connecting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Start
          </button>
          <button
            onClick={handleStop}
            disabled={!connected || connecting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Stop
          </button>
        </div>
      </div>

      {connected && (
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-400">Claude Code MCP Config</h2>
            <button
              onClick={handleCopyMcp}
              className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                mcpCopied ? 'bg-green-600 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {mcpCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="bg-gray-800 rounded-lg p-3 text-xs text-green-400 overflow-x-auto font-mono">
{`{
  "mcpServers": {
    "aitmeow": {
      "url": "http://127.0.0.1:${port}/mcp"
    }
  }
}`}
          </pre>
        </div>
      )}

      <div className="bg-gray-900 rounded-lg border border-gray-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm text-gray-400">Logs</h2>
          <button onClick={clearLogs} className="text-xs text-gray-600 hover:text-gray-400">
            Clear
          </button>
        </div>
        <div className="h-40 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
          {logs.length === 0 ? (
            <p className="text-gray-600 italic">Start the server to see output</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="text-gray-400">
                <span className="text-gray-700">[{i + 1}]</span> {log}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}

async function checkHealth(port: number): Promise<boolean> {
  try {
    (window as any).__AITMEOW_PORT__ = port;
    const r = await api.health();
    return r.status === 'ok';
  } catch {
    return false;
  }
}

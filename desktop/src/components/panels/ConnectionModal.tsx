import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import StatusIndicator from '@/components/common/StatusIndicator';
import { useConnectionStore } from '@/stores/connectionStore';
import { api } from '@/services/api';
import { wsClient } from '@/services/ws';

interface ConnectionModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ConnectionModal({ open, onClose }: ConnectionModalProps) {
  const { port, connected, connecting, logs, setPort, setConnected, setConnecting, addLog, clearLogs } = useConnectionStore();
  const [inputPort, setInputPort] = useState(String(port));
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  useEffect(() => {
    if (!connected) return;
    const iv = setInterval(async () => {
      try { await api.health(); } catch { setConnected(false); addLog('连接断开'); }
    }, 5000);
    return () => clearInterval(iv);
  }, [connected]);

  const handleStart = async () => {
    const portNum = parseInt(inputPort, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) { toast.error('端口号无效'); return; }
    setConnecting(true);
    addLog(`正在连接端口 ${portNum}...`);
    try {
      if (window.electronAPI) {
        const r = await window.electronAPI.connectionStart(portNum);
        if (!r.success) { addLog(`错误: ${r.error}`); toast.error(r.error || '连接失败'); return; }
      }
      (window as any).__AITMEOW_PORT__ = portNum;
      await api.health();
      setPort(portNum); setConnected(true);
      wsClient.connect(portNum);
      addLog(`已连接到端口 ${portNum}`);
      toast.success('连接成功');
    } catch (e: any) {
      addLog(`失败: ${e.message || e}`);
      toast.error('无法连接到服务端');
    } finally { setConnecting(false); }
  };

  const handleStop = async () => {
    setConnecting(true); addLog('正在断开...');
    try {
      wsClient.disconnect();
      if (window.electronAPI) await window.electronAPI.connectionStop();
      setConnected(false);
      addLog('已断开连接'); toast.success('已断开');
    } catch (e: any) { addLog(`错误: ${e.message || e}`); }
    finally { setConnecting(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-[420px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">连接管理</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
          <StatusIndicator status={connected ? 'connected' : connecting ? 'connecting' : 'disconnected'} size="md" />
          <div>
            <p className="text-sm font-medium text-slate-700">{connected ? '已连接' : connecting ? '连接中...' : '未连接'}</p>
            {connected && <p className="text-xs text-slate-500">端口 {port}</p>}
          </div>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-slate-600">端口号</label>
            <input type="number" value={inputPort} onChange={(e) => setInputPort(e.target.value)} disabled={connected || connecting}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 disabled:opacity-50 text-slate-700" />
          </div>
          <button onClick={handleStart} disabled={connected || connecting}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">连接</button>
          <button onClick={handleStop} disabled={!connected}
            className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">断开</button>
        </div>

        <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
            <span className="text-xs font-medium text-slate-600">日志</span>
            <button onClick={clearLogs} className="text-[10px] text-slate-500 hover:text-slate-700">清空</button>
          </div>
          <div className="h-32 overflow-y-auto p-3 font-mono text-[10px] space-y-0.5 text-slate-600">
            {logs.length === 0 ? <p className="text-slate-400">暂无日志</p> : logs.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

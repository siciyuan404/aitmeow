import { useState, useCallback, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import TopBar from '@/components/layout/TopBar';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import LeftPanel from '@/components/panels/LeftPanel';
import CenterPanel from '@/components/panels/CenterPanel';
import RightPanel from '@/components/panels/RightPanel';
import RuleBar from '@/components/panels/RuleBar';
import SettingsDrawer from '@/components/panels/SettingsDrawer';
import TemplatePanel from '@/components/template/TemplatePanel';
import { useConnectionStore } from '@/stores/connectionStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTemplateStore } from '@/stores/templateStore';
import { api } from '@/services/api';
import { wsClient } from '@/services/ws';

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [selectedSvgId, setSelectedSvgId] = useState<string | null>(null);
  const [activeRules, setActiveRules] = useState<Set<string>>(
    new Set(['max_size', 'viewbox', 'require_ids']),
  );
  const { connected, port, setPort, setConnected, setConnecting, addLog } = useConnectionStore();
  const { port: settingsPort, loadSettings } = useSettingsStore();
  const { togglePanel, setMode } = useTemplateStore();

  useEffect(() => { loadSettings(); }, []);

  // 连接成功后，将桌面端状态同步到服务端 Session
  useEffect(() => {
    if (!connected) return;
    api.updateSessionState({
      selected_template: selectedTemplate?.name || null,
      template_params: templateParams,
      active_rules: Array.from(activeRules),
    }).catch((err: Error) => console.warn('同步 session 失败:', err.message));
  }, [selectedTemplate, templateParams, activeRules, connected]);

  useEffect(() => {
    let cancelled = false;
    let retries = 0;

    async function tryConnect() {
      setConnecting(true);
      const ports = [settingsPort];
      for (const p of ports) {
        (window as any).__AITMEOW_PORT__ = p;
        try {
          await api.health();
          if (cancelled) return;
          setPort(p);
          setConnected(true);
          wsClient.connect(p);
          addLog(`已连接到端口 ${p}`);
          return;
        } catch {
          // try next port
        }
      }
      if (cancelled) return;
      retries++;
      if (retries < 10) {
        setTimeout(tryConnect, 1500);
      } else {
        setConnecting(false);
        addLog('无法连接到服务端，请检查服务是否启动');
      }
    }

    tryConnect();
    return () => { cancelled = true; };
  }, []);

  const toggleRule = useCallback((id: string) => {
    setActiveRules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleOpenTemplatePanel = useCallback(() => {
    togglePanel();
    setMode('preview');
  }, [togglePanel, setMode]);

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-gray-100 text-slate-700 antialiased selection:bg-blue-100">
        <TopBar
          connected={connected}
          port={port}
          onSettingsClick={() => setSettingsOpen(true)}
          onTemplateClick={handleOpenTemplatePanel}
        />

        <main className="flex-1 flex overflow-hidden min-h-0">
          <LeftPanel
            selectedTemplate={selectedTemplate}
            templateParams={templateParams}
            onSelectTemplate={setSelectedTemplate}
            onParamsChange={setTemplateParams}
          />
          <CenterPanel
            templateParams={templateParams}
            activeRules={activeRules}
            selectedTemplateName={selectedTemplate?.name || null}
            onSaveSuccess={(id) => setSelectedSvgId(id)}
          />
          <RightPanel
            selectedId={selectedSvgId}
            onSelect={setSelectedSvgId}
          />
        </main>

        <RuleBar active={activeRules} onToggle={toggleRule} />
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <TemplatePanel />

      <Toaster position="bottom-right" theme="light" />
    </ErrorBoundary>
  );
}

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
import UiLocatorOverlay from '@/components/dev/UiLocatorOverlay';
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
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeRules, setActiveRules] = useState<Set<string>>(
    new Set(['max_size', 'viewbox', 'require_ids']),
  );
  const { connected, port, setPort, setConnected, setConnecting, addLog } = useConnectionStore();
  const { port: settingsPort, loadSettings } = useSettingsStore();
  const refreshTemplates = useTemplateStore((s) => s.refreshTemplates);

  useEffect(() => { loadSettings(); }, []);

  // 全局订阅更新状态（后台自动检查/下载，这里只负责在顶栏给一个轻量提示）
  const [updateState, setUpdateState] = useState<any>(null);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const apply = (next: any) => {
      setUpdateState((prev: any) => (prev && prev.seq > next.seq ? prev : next));
    };

    const unsubscribe = api.onUpdateStateChanged(apply);
    api.updateGetState().then(apply).catch(() => {});
    return unsubscribe;
  }, []);

  // 监听模板变更事件（MCP/REST 创建/更新/删除模板），实时刷新桌面端模板列表
  useEffect(() => {
    const unsubscribe = wsClient.on('TemplateChanged', (data: any) => {
      refreshTemplates();
      const action = data?.action || 'changed';
      const name = data?.template_name || '';
      const msg = action === 'created' ? `模板「${name}」已创建` :
                  action === 'updated' ? `模板「${name}」已更新` :
                  action === 'deleted' ? `模板「${name}」已删除` :
                  `模板列表已更新`;
      toast.info(msg);
    });
    return unsubscribe;
  }, [refreshTemplates]);

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

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-gray-100 text-slate-700 antialiased selection:bg-blue-100">
        <TopBar
          connected={connected}
          port={port}
          updateState={updateState}
          onSettingsClick={() => setSettingsOpen(true)}
        />

        <main className="flex-1 flex overflow-hidden min-h-0">
          {leftPanelOpen && (
            <LeftPanel
              selectedTemplate={selectedTemplate}
              templateParams={templateParams}
              onSelectTemplate={setSelectedTemplate}
              onParamsChange={setTemplateParams}
            />
          )}
          <CenterPanel
            templateParams={templateParams}
            activeRules={activeRules}
            selectedTemplateName={selectedTemplate?.name || null}
            leftPanelOpen={leftPanelOpen}
            rightPanelOpen={rightPanelOpen}
            onToggleLeftPanel={() => setLeftPanelOpen((open) => !open)}
            onToggleRightPanel={() => setRightPanelOpen((open) => !open)}
            onSaveSuccess={(id) => setSelectedSvgId(id)}
          />
          {rightPanelOpen && (
            <RightPanel
              selectedId={selectedSvgId}
              onSelect={setSelectedSvgId}
            />
          )}
        </main>

        <RuleBar active={activeRules} onToggle={toggleRule} />
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <TemplatePanel />
      <UiLocatorOverlay />

      <Toaster position="bottom-right" theme="light" />
    </ErrorBoundary>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useConnectionStore } from '@/stores/connectionStore';
import TopBar from '@/components/layout/TopBar';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import LeftPanel from '@/components/panels/LeftPanel';
import CenterPanel from '@/components/panels/CenterPanel';
import RightPanel from '@/components/panels/RightPanel';
import RuleBar from '@/components/panels/RuleBar';

export default function MainPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [selectedSvgId, setSelectedSvgId] = useState<string | null>(null);
  const [activeRules, setActiveRules] = useState<Set<string>>(
    new Set(['max_size', 'viewbox', 'require_ids']),
  );

  const { connected, port } = useConnectionStore();
  const { loadSettings } = useSettingsStore();
  const { togglePanel, setMode } = useTemplateStore();

  useEffect(() => {
    loadSettings();
  }, []);

  // 连接成功后同步 session 到服务端
  useEffect(() => {
    if (!connected) return;
    api.updateSessionState({
      selected_template: selectedTemplate?.name || null,
      template_params: templateParams,
      active_rules: Array.from(activeRules),
    }).catch((err: Error) => console.warn('同步 session 失败:', err.message));
  }, [selectedTemplate, templateParams, activeRules, connected]);

  // 设置窗口关闭后重新加载设置
  useEffect(() => {
    if (window.electronAPI?.onSettingsReload) {
      return window.electronAPI.onSettingsReload(() => loadSettings());
    }
  }, [loadSettings]);

  const toggleRule = useCallback((id: string) => {
    setActiveRules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
            onSaveSuccess={(id: string) => setSelectedSvgId(id)}
          />
          <RightPanel selectedId={selectedSvgId} onSelect={setSelectedSvgId} />
        </main>
        <RuleBar active={activeRules} onToggle={toggleRule} />
      </div>
    </ErrorBoundary>
  );
}

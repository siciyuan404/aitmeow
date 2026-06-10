import { useState, useCallback } from 'react';
import { Toaster } from 'sonner';
import TopBar from '@/components/layout/TopBar';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import LeftPanel from '@/components/panels/LeftPanel';
import CenterPanel from '@/components/panels/CenterPanel';
import RightPanel from '@/components/panels/RightPanel';
import RuleBar from '@/components/panels/RuleBar';
import SettingsDrawer from '@/components/panels/SettingsDrawer';
import ConnectionModal from '@/components/panels/ConnectionModal';
import { useConnectionStore } from '@/stores/connectionStore';
import { useSettingsStore } from '@/stores/settingsStore';

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [selectedSvgId, setSelectedSvgId] = useState<string | null>(null);
  const [activeRules, setActiveRules] = useState<Set<string>>(
    new Set(['max_size', 'viewbox', 'require_ids']),
  );
  const { connected, port } = useConnectionStore();
  const { loadSettings } = useSettingsStore();

  useState(() => { loadSettings(); });

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
          onConnectionClick={() => setConnectionOpen(true)}
          onSettingsClick={() => setSettingsOpen(true)}
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
      <ConnectionModal open={connectionOpen} onClose={() => setConnectionOpen(false)} />

      <Toaster position="bottom-right" theme="light" />
    </ErrorBoundary>
  );
}

import { useTemplateStore } from '@/stores/templateStore';
import type { PanelMode } from '@/types/template';

export function useTemplatePanel() {
  const panelExpanded = useTemplateStore(s => s.panelExpanded);
  const activeMode = useTemplateStore(s => s.activeMode);
  const togglePanel = useTemplateStore(s => s.togglePanel);
  const setMode = useTemplateStore(s => s.setMode);

  const expandPanel = () => {
    if (!panelExpanded) {
      togglePanel();
    }
  };

  const collapsePanel = () => {
    if (panelExpanded) {
      togglePanel();
    }
  };

  const switchToMode = (mode: PanelMode) => {
    expandPanel();
    setMode(mode);
  };

  return {
    panelExpanded,
    activeMode,
    togglePanel,
    expandPanel,
    collapsePanel,
    switchToMode,
  };
}

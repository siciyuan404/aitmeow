import { useEffect } from 'react';
import { useTemplateStore } from '@/stores/templateStore';
import { useTemplateSelection } from './useTemplateSelection';

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  allTemplateIds?: string[];
}

export function useKeyboardShortcuts({
  enabled = true,
  onDelete,
  onSelectAll,
  onClearSelection,
  allTemplateIds = [],
}: UseKeyboardShortcutsOptions = {}) {
  const activeMode = useTemplateStore(s => s.activeMode);
  const { selectedCount, selectAll, clearSelection } = useTemplateSelection();

  useEffect(() => {
    if (!enabled || activeMode !== 'manage') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl+A / Cmd+A - Select All
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (onSelectAll) {
          onSelectAll();
        } else {
          selectAll(allTemplateIds);
        }
        return;
      }

      // Delete key - Delete selected items
      if (e.key === 'Delete' && selectedCount > 0) {
        e.preventDefault();
        if (onDelete) {
          onDelete();
        }
        return;
      }

      // Escape - Clear selection
      if (e.key === 'Escape' && selectedCount > 0) {
        e.preventDefault();
        if (onClearSelection) {
          onClearSelection();
        } else {
          clearSelection();
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    activeMode,
    selectedCount,
    onDelete,
    onSelectAll,
    onClearSelection,
    allTemplateIds,
    selectAll,
    clearSelection,
  ]);
}

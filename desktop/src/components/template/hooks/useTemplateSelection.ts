import { useTemplateStore } from '@/stores/templateStore';

export function useTemplateSelection() {
  const selectedIds = useTemplateStore(s => s.selectedIds);
  const toggleSelection = useTemplateStore(s => s.toggleSelection);

  const selectRange = (fromId: string, toId: string, allIds: string[]) => {
    const fromIdx = allIds.indexOf(fromId);
    const toIdx = allIds.indexOf(toId);

    if (fromIdx === -1 || toIdx === -1) return;

    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    const rangeIds = allIds.slice(start, end + 1);

    useTemplateStore.setState(s => {
      s.selectedIds = rangeIds;
      s.lastSelectedId = toId;
    });
  };

  const selectAll = (allIds: string[]) => {
    useTemplateStore.setState(s => {
      s.selectedIds = [...allIds];
    });
  };

  const clearSelection = () => {
    useTemplateStore.setState(s => {
      s.selectedIds = [];
      s.lastSelectedId = null;
    });
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  return {
    selectedIds,
    toggleSelection,
    selectRange,
    selectAll,
    clearSelection,
    isSelected,
    selectedCount: selectedIds.length,
  };
}

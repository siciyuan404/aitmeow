import { useTemplateSelection } from '../hooks/useTemplateSelection';

interface TemplateBatchToolbarProps {
  totalCount: number;
  onDelete: () => void;
  onExport: () => void;
  onChangeCategory: () => void;
  onImport: () => void;
  isProcessing?: boolean;
}

export function TemplateBatchToolbar({
  totalCount,
  onDelete,
  onExport,
  onChangeCategory,
  onImport,
  isProcessing = false,
}: TemplateBatchToolbarProps) {
  const { selectedCount, selectAll, clearSelection } = useTemplateSelection();
  const hasSelection = selectedCount > 0;

  const handleSelectAll = () => {
    // This will be called with all template IDs from the parent
    selectAll([]);
  };

  const handleInvertSelection = () => {
    // TODO: Implement invert selection logic
    console.log('Invert selection');
  };

  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3">
      {/* Left: Selection status */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {hasSelection ? (
            <>
              <span className="font-medium text-gray-900">{selectedCount}</span> selected
            </>
          ) : (
            'No items selected'
          )}
        </span>

        {/* Quick selection actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectAll}
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
            disabled={isProcessing}
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleInvertSelection}
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
            disabled={isProcessing}
            title="Coming soon"
          >
            Invert
          </button>
          {hasSelection && (
            <>
              <span className="text-gray-300">|</span>
              <button
                onClick={clearSelection}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                disabled={isProcessing}
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right: Batch actions */}
      <div className="flex items-center gap-2">
        {/* Import button - always available */}
        <button
          onClick={onImport}
          disabled={isProcessing}
          className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Import
        </button>

        {/* Batch actions - only enabled when items are selected */}
        <button
          onClick={onExport}
          disabled={!hasSelection || isProcessing}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export
        </button>

        <button
          onClick={onChangeCategory}
          disabled={!hasSelection || isProcessing}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Change Category
        </button>

        <button
          onClick={onDelete}
          disabled={!hasSelection || isProcessing}
          className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import type { ImportResult, ConflictStrategy } from '@/types/template';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (strategy: ConflictStrategy) => void;
  results: ImportResult[];
  isProcessing?: boolean;
}

export function ImportDialog({
  isOpen,
  onClose,
  onImport,
  results,
  isProcessing = false,
}: ImportDialogProps) {
  const [strategy, setStrategy] = useState<ConflictStrategy>('rename');

  const validCount = results.filter(r => r.valid).length;
  const conflictCount = results.filter(r => r.valid && r.conflict).length;
  const errorCount = results.filter(r => !r.valid).length;

  useEffect(() => {
    if (!isOpen) {
      setStrategy('rename');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImport = () => {
    onImport(strategy);
  };

  const getStatusIcon = (result: ImportResult) => {
    if (!result.valid) return '❌';
    if (result.conflict) return '⚠️';
    return '✓';
  };

  const getStatusColor = (result: ImportResult) => {
    if (!result.valid) return 'text-red-600';
    if (result.conflict) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Import Templates</h2>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto px-6 py-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Ready to import <span className="font-medium">{validCount}</span> template
              {validCount !== 1 ? 's' : ''}
              {conflictCount > 0 && (
                <>
                  {' '}
                  (<span className="font-medium text-yellow-600">{conflictCount}</span> conflict
                  {conflictCount !== 1 ? 's' : ''})
                </>
              )}
              {errorCount > 0 && (
                <>
                  {' '}
                  (<span className="font-medium text-red-600">{errorCount}</span> error
                  {errorCount !== 1 ? 's' : ''})
                </>
              )}
            </p>
          </div>

          {/* Results list */}
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded border border-gray-200 p-3"
              >
                <span className={`text-lg ${getStatusColor(result)}`}>
                  {getStatusIcon(result)}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {result.template?.name || result.originalName || `Template ${index + 1}`}
                  </div>
                  {result.conflict && strategy === 'rename' && result.suggestedName && (
                    <div className="text-sm text-gray-600">
                      Will be renamed to: <span className="font-medium">{result.suggestedName}</span>
                    </div>
                  )}
                  {result.conflict && strategy === 'overwrite' && (
                    <div className="text-sm text-yellow-600">
                      Will overwrite existing template
                    </div>
                  )}
                  {result.conflict && strategy === 'skip' && (
                    <div className="text-sm text-gray-500">
                      Will be skipped (conflict)
                    </div>
                  )}
                  {result.error && (
                    <div className="text-sm text-red-600">{result.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Conflict strategy selector */}
          {conflictCount > 0 && (
            <div className="mt-6 rounded-lg bg-gray-50 p-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Conflict handling strategy:
              </label>
              <select
                value={strategy}
                onChange={e => setStrategy(e.target.value as ConflictStrategy)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isProcessing}
              >
                <option value="rename">Rename conflicting templates (safe)</option>
                <option value="overwrite">Overwrite existing templates (destructive)</option>
                <option value="skip">Skip conflicting templates</option>
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isProcessing || validCount === 0}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? 'Importing...' : `Import ${validCount} Template${validCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

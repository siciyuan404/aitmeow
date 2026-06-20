import { useState, useMemo, useRef } from 'react';
import { useTemplateStore } from '@/stores/templateStore';
import { useTemplateSelection } from '../hooks/useTemplateSelection';
import { useTemplateBatch } from '../hooks/useTemplateBatch';
import { useTemplateImportExport } from '../hooks/useTemplateImportExport';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import TemplateSearch from '../components/TemplateSearch';
import CategorySidebar from '../components/CategorySidebar';
import TemplateGrid from '../components/TemplateGrid';
import TemplateList from '../components/TemplateList';
import { TemplateBatchToolbar } from '../components/TemplateBatchToolbar';
import { ImportDialog } from '../components/ImportDialog';
import type { TemplateDefinition, ImportResult, ConflictStrategy } from '@/types/template';
import { toast } from 'sonner';

export default function ManageMode() {
  const templates = useTemplateStore(s => s.templates);
  const viewMode = useTemplateStore(s => s.viewMode);
  const setViewMode = useTemplateStore(s => s.setViewMode);
  const searchQuery = useTemplateStore(s => s.searchQuery);
  const categoryFilter = useTemplateStore(s => s.categoryFilter);
  const sortBy = useTemplateStore(s => s.sortBy);
  const setSortBy = useTemplateStore(s => s.setSortBy);

  const { selectedIds, clearSelection, selectAll } = useTemplateSelection();
  const { deleteMultiple, exportMultiple, updateCategory, isProcessing } = useTemplateBatch();
  const { importFromJSON, importFromZip, executeImportBatch, isProcessing: isImporting } =
    useTemplateImportExport();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [newCategory, setNewCategory] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    // Sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'category':
        sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
    }

    return sorted;
  }, [templates, searchQuery, categoryFilter, sortBy]);

  const selectedTemplates = useMemo(
    () => templates.filter(t => selectedIds.includes(t.name)),
    [templates, selectedIds]
  );

  // Get unique categories for the category dialog
  const categories = useMemo(() => {
    return Array.from(new Set(templates.map(t => t.category))).sort();
  }, [templates]);

  const handleSelectAll = () => {
    selectAll(filteredTemplates.map(t => t.name));
  };

  // Enable keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    onDelete: () => setShowDeleteConfirm(true),
    onSelectAll: handleSelectAll,
    allTemplateIds: filteredTemplates.map(t => t.name),
  });

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    await deleteMultiple(selectedTemplates);
    clearSelection();
    // TODO: Refresh template list from store
  };

  const handleExport = async () => {
    await exportMultiple(selectedTemplates);
  };

  const handleChangeCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    setShowCategoryDialog(false);
    await updateCategory(selectedTemplates, newCategory.trim());
    clearSelection();
    setNewCategory('');
    // TODO: Refresh template list from store
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let results: ImportResult[];

      if (file.name.endsWith('.json')) {
        const content = await file.text();
        const result = await importFromJSON(content);
        results = [result];
      } else if (file.name.endsWith('.zip')) {
        results = await importFromZip(file);
      } else {
        toast.error('Please select a .json or .zip file');
        return;
      }

      setImportResults(results);
      setShowImportDialog(true);
    } catch (error) {
      console.error('Failed to read file:', error);
      toast.error('Failed to read file');
    }

    // Reset file input
    e.target.value = '';
  };

  const handleImport = async (strategy: ConflictStrategy) => {
    const result = await executeImportBatch(importResults, strategy);
    setShowImportDialog(false);
    setImportResults([]);
    // TODO: Refresh template list from store
  };

  return (
    <div className="flex h-full flex-col">
      {/* Batch toolbar */}
      <TemplateBatchToolbar
        totalCount={filteredTemplates.length}
        allTemplateIds={filteredTemplates.map(t => t.name)}
        onDelete={() => setShowDeleteConfirm(true)}
        onExport={handleExport}
        onChangeCategory={() => setShowCategoryDialog(true)}
        onImport={handleImportClick}
        isProcessing={isProcessing || isImporting}
      />

      {/* Toolbar */}
      <div className="space-y-3 border-b border-slate-200 p-4">
        {/* Search bar */}
        <TemplateSearch />

        {/* View and sort */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ⊞ Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ☰ List
            </button>
          </div>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="rounded-lg border-2 border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          >
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="category">Category</option>
          </select>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Category sidebar */}
        <CategorySidebar />

        {/* Template list */}
        <div className="flex-1 overflow-y-auto p-4">
          {viewMode === 'grid' ? (
            <TemplateGrid
              templates={filteredTemplates}
              onEdit={t => console.log('Edit', t)}
              onDelete={t => console.log('Delete', t)}
              onCopy={t => console.log('Copy', t)}
            />
          ) : (
            <TemplateList
              templates={filteredTemplates}
              onEdit={t => console.log('Edit', t)}
              onDelete={t => console.log('Delete', t)}
            />
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.zip"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Confirm Deletion</h3>
            <p className="mb-6 text-sm text-gray-600">
              Are you sure you want to delete {selectedIds.length} template
              {selectedIds.length !== 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category change dialog */}
      {showCategoryDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Change Category</h3>
            <p className="mb-4 text-sm text-gray-600">
              Select a category for {selectedIds.length} template
              {selectedIds.length !== 1 ? 's' : ''}:
            </p>
            <div className="mb-6">
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Select or type new --</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="Or enter new category name"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCategoryDialog(false);
                  setNewCategory('');
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeCategory}
                disabled={!newCategory.trim()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Change Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import dialog */}
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => {
          setShowImportDialog(false);
          setImportResults([]);
        }}
        onImport={handleImport}
        results={importResults}
        isProcessing={isImporting}
      />
    </div>
  );
}

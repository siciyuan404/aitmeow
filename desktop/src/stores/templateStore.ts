import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { TemplateDefinition, ViewMode, SortBy, PanelMode } from '../types/template';
import { api } from '../services/api';

interface TemplateState {
  templates: TemplateDefinition[];
  categories: string[];
  selectedTemplate: string | null;
  templateParams: Record<string, string>;
  loading: boolean;
  error: string | null;

  // Panel state
  panelExpanded: boolean;
  activeMode: PanelMode;

  // View state
  viewMode: ViewMode;
  searchQuery: string;
  categoryFilter: string | null;
  sortBy: SortBy;

  // Selection state
  selectedIds: string[];
  lastSelectedId: string | null;

  // Edit state
  editingTemplate: TemplateDefinition | null;

  setTemplates: (templates: TemplateDefinition[], categories: string[]) => void;
  selectTemplate: (name: string | null) => void;
  setParam: (key: string, value: string) => void;
  setParams: (params: Record<string, string>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  createTemplate: (data: Omit<TemplateDefinition, 'validation'>) => Promise<void>;
  updateTemplate: (name: string, data: TemplateDefinition) => Promise<void>;
  deleteTemplate: (name: string) => Promise<void>;
  refreshTemplates: () => Promise<void>;

  // New methods
  togglePanel: () => void;
  setMode: (mode: PanelMode) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string | null) => void;
  setSortBy: (sort: SortBy) => void;
  toggleSelection: (id: string) => void;

  // Edit mode methods
  startEdit: (template?: TemplateDefinition) => void;
  cancelEdit: () => void;
  saveTemplate: (template: TemplateDefinition) => Promise<void>;
}

export const useTemplateStore = create<TemplateState>()(
  immer((set) => ({
    templates: [],
    categories: [],
    selectedTemplate: null,
    templateParams: {},
    loading: false,
    error: null,

    // Panel state defaults
    panelExpanded: false,
    activeMode: 'browse' as PanelMode,

    // View state defaults
    viewMode: 'grid' as ViewMode,
    searchQuery: '',
    categoryFilter: null,
    sortBy: 'name-asc' as SortBy,

    // Selection state defaults
    selectedIds: [],
    lastSelectedId: null,

    // Edit state defaults
    editingTemplate: null,

    setTemplates: (templates, categories) =>
      set((s) => {
        s.templates = templates;
        s.categories = categories;
      }),

    selectTemplate: (name) =>
      set((s) => {
        s.selectedTemplate = name;
        s.templateParams = {};
        if (name) {
          const tpl = s.templates.find((t) => t.name === name);
          if (tpl) {
            for (const opt of tpl.options) {
              s.templateParams[opt.key] = opt.default;
            }
          }
        }
      }),

    setParam: (key, value) =>
      set((s) => {
        s.templateParams[key] = value;
      }),

    setParams: (params) =>
      set((s) => {
        s.templateParams = params;
      }),

    setLoading: (loading) =>
      set((s) => {
        s.loading = loading;
      }),

    setError: (error) =>
      set((s) => {
        s.error = error;
      }),

    createTemplate: async (data) => {
      set((s) => { s.loading = true; s.error = null; });
      try {
        const created = await api.createTemplate({
          ...data,
          validation: { rules: [], retry_on_fail: 0 },
        });
        set((s) => {
          s.templates.push(created);
          if (!s.categories.includes(created.category)) {
            s.categories.push(created.category);
          }
        });
      } catch (err: any) {
        set((s) => { s.error = err.message || 'Failed to create template'; });
        throw err;
      } finally {
        set((s) => { s.loading = false; });
      }
    },

    updateTemplate: async (name, data) => {
      set((s) => { s.loading = true; s.error = null; });
      try {
        const updated = await api.updateTemplate(name, data);
        set((s) => {
          const idx = s.templates.findIndex((t) => t.name === name);
          if (idx !== -1) {
            s.templates[idx] = updated;
          }
        });
      } catch (err: any) {
        set((s) => { s.error = err.message || 'Failed to update template'; });
        throw err;
      } finally {
        set((s) => { s.loading = false; });
      }
    },

    deleteTemplate: async (name) => {
      set((s) => { s.loading = true; s.error = null; });
      try {
        await api.deleteTemplate(name);
        set((s) => {
          s.templates = s.templates.filter((t) => t.name !== name);
          if (s.selectedTemplate === name) {
            s.selectedTemplate = null;
            s.templateParams = {};
          }
        });
      } catch (err: any) {
        set((s) => { s.error = err.message || 'Failed to delete template'; });
        throw err;
      } finally {
        set((s) => { s.loading = false; });
      }
    },

    refreshTemplates: async () => {
      set((s) => { s.loading = true; });
      try {
        const res = await api.listTemplates();
        set((s) => {
          s.templates = res.templates;
          s.categories = res.categories;
          s.error = null;
        });
      } catch (err: any) {
        set((s) => { s.error = err.message || 'Failed to load templates'; });
      } finally {
        set((s) => { s.loading = false; });
      }
    },

    togglePanel: () => set((s) => { s.panelExpanded = !s.panelExpanded; }),

    setMode: (mode: PanelMode) => set((s) => {
      s.activeMode = mode;
      if (mode !== 'manage') {
        s.selectedIds = [];
        s.lastSelectedId = null;
      }
      // Reset search and filters when switching modes
      s.searchQuery = '';
      s.categoryFilter = null;
    }),

    setViewMode: (mode: ViewMode) => set((s) => { s.viewMode = mode; }),

    setSearchQuery: (query: string) => set((s) => { s.searchQuery = query; }),

    setCategoryFilter: (category: string | null) => set((s) => { s.categoryFilter = category; }),

    setSortBy: (sort: SortBy) => set((s) => { s.sortBy = sort; }),

    toggleSelection: (id: string) => set((s) => {
      const idx = s.selectedIds.indexOf(id);
      if (idx !== -1) {
        s.selectedIds.splice(idx, 1);
      } else {
        s.selectedIds.push(id);
      }
      s.lastSelectedId = id;
    }),

    startEdit: (template?: TemplateDefinition) => set((s) => {
      s.editingTemplate = template || null;
      s.activeMode = 'edit';
    }),

    cancelEdit: () => set((s) => {
      s.editingTemplate = null;
    }),

    saveTemplate: async (template: TemplateDefinition) => {
      const currentEditingTemplate = useTemplateStore.getState().editingTemplate;
      set((s) => { s.loading = true; s.error = null; });
      try {
        const isNew = !currentEditingTemplate;

        if (isNew) {
          // Create new template
          const created = await api.createTemplate(template);
          set((s) => {
            s.templates.push(created);
            if (!s.categories.includes(created.category)) {
              s.categories.push(created.category);
            }
            s.editingTemplate = null;
          });
        } else {
          // Update existing template
          const updated = await api.updateTemplate(template.name, template);
          set((s) => {
            const idx = s.templates.findIndex((t) => t.name === template.name);
            if (idx !== -1) {
              s.templates[idx] = updated;
            }
            s.editingTemplate = null;
          });
        }
      } catch (err: any) {
        set((s) => { s.error = err.message || 'Failed to save template'; });
        throw err;
      } finally {
        set((s) => { s.loading = false; });
      }
    },
  }))
);
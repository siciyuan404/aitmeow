import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { TemplateDefinition } from '../types/template';

interface TemplateState {
  templates: TemplateDefinition[];
  categories: string[];
  selectedTemplate: string | null;
  templateParams: Record<string, string>;
  loading: boolean;
  error: string | null;

  setTemplates: (templates: TemplateDefinition[], categories: string[]) => void;
  selectTemplate: (name: string | null) => void;
  setParam: (key: string, value: string) => void;
  setParams: (params: Record<string, string>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTemplateStore = create<TemplateState>()(
  immer((set) => ({
    templates: [],
    categories: [],
    selectedTemplate: null,
    templateParams: {},
    loading: false,
    error: null,

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
  }))
);
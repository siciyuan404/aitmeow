// Template type definitions shared across desktop frontend
export interface TemplateOption {
  type: 'color' | 'select' | 'text' | 'range';
  key: string;
  label: string;
  default: string;
  options?: string[];   // for select type
  placeholder?: string; // for text type
  min?: number;         // for range type
  max?: number;
  step?: number;
}

export interface TemplateExample {
  svg_content: string;
  description?: string;
  params?: Record<string, string>;
}

export interface TemplateDefinition {
  name: string;
  description: string;
  category: string;
  reference: string | null;
  prompt_template: string;
  options: TemplateOption[];
  validation: { rules: string[]; retry_on_fail: number };
  examples?: TemplateExample[];
}

export interface TemplateListResponse {
  templates: TemplateDefinition[];
  categories: string[];
  total: number;
}

// Template UI types for panel modes and views
export type ViewMode = 'grid' | 'list';
export type SortBy = 'name-asc' | 'name-desc' | 'created' | 'updated' | 'category';
export type PanelMode = 'browse' | 'edit' | 'manage' | 'preview';

export interface TemplateCardAction {
  icon: string;
  label: string;
  onClick: (template: TemplateDefinition) => void;
  variant?: 'default' | 'danger';
}

// Import/Export types
export interface ImportResult {
  valid: boolean;
  template?: TemplateDefinition;
  conflict?: boolean;
  suggestedName?: string;
  error?: string;
  originalName?: string;
}

export interface ExportManifest {
  version: string;
  exported_at: string;
  count: number;
  templates: string[];
}

export type ConflictStrategy = 'rename' | 'overwrite' | 'skip';

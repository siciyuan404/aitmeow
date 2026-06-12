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

export interface TemplateDefinition {
  name: string;
  description: string;
  category: string;
  reference: string | null;
  prompt_template: string;
  options: TemplateOption[];
  validation: { rules: string[]; retry_on_fail: number };
}

export interface TemplateListResponse {
  templates: TemplateDefinition[];
  categories: string[];
  total: number;
}

const getBaseUrl = () => {
  const port = (window as any).__AITMEOW_PORT__ || 8765;
  return `http://127.0.0.1:${port}`;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${text || response.statusText}`);
  }
  return response.json();
}

export interface SvgRecord {
  id: string;
  name: string;
  svg_content: string;
  template_name: string | null;
  tags: string[];
  params: Record<string, string>;
  width: number | null;
  height: number | null;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
}

export interface SvgListResponse {
  items: SvgRecord[];
  total: number;
}

export interface ValidationResponse {
  valid: boolean;
  errors: Array<{ line: number; column: number; message: string; code: string }>;
  warnings: string[];
}

export interface RenderResponse {
  data: string;
  format: string;
  size_bytes: number;
}

export interface TemplateOption {
  type: 'color' | 'select' | 'text' | 'range';
  key: string;
  label: string;
  default: string;
  options?: string[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface Template {
  name: string;
  description: string;
  category: string;
  reference: string | null;
  prompt_template: string;
  options: TemplateOption[];
  validation: { rules: string[]; retry_on_fail: number };
}

export interface TemplateListResponse {
  templates: Template[];
  categories: string[];
  total: number;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export interface ReferenceSvg {
  id: string;
  name: string;
  svg_content: string;
}

export interface SessionState {
  selected_template: string | null;
  template_params: Record<string, string>;
  active_rules: string[];
  compiled_prompt: string | null;
  template_details: Template | null;
  reference_svg: ReferenceSvg | null;
  pending_generation: GenerationResult | null;
}

export interface GenerationResult {
  id: string;
  template_name: string;
  params: Record<string, string>;
  svg_content: string;
  created_at: string;
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),

  validate: (svg: string, rules?: string[]) =>
    request<ValidationResponse>('/api/validate', {
      method: 'POST',
      body: JSON.stringify({ svg, rules }),
    }),

  render: (svg: string, opts?: { width?: number; height?: number; background_color?: string }) =>
    request<RenderResponse>('/api/render', {
      method: 'POST',
      body: JSON.stringify({ svg, ...opts }),
    }),

  listSvgs: (params?: { offset?: number; limit?: number; sort_by?: string; sort_order?: string; tag?: string }) => {
    const qs = new URLSearchParams();
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.sort_by) qs.set('sort_by', params.sort_by);
    if (params?.sort_order) qs.set('sort_order', params.sort_order);
    if (params?.tag) qs.set('tag', params.tag);
    return request<SvgListResponse>(`/api/svg?${qs.toString()}`);
  },

  saveSvg: (data: {
    name: string;
    svg_content: string;
    template_name?: string;
    tags?: string[];
    params?: Record<string, string>;
    width?: number;
    height?: number;
  }) =>
    request<SvgRecord>('/api/svg', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSvg: (id: string) => request<SvgRecord>(`/api/svg/${id}`),

  deleteSvg: (id: string) => request<{ deleted: boolean }>(`/api/svg/${id}`, { method: 'DELETE' }),

  searchSvgs: (q?: string, tags?: string[]) => {
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (tags && tags.length > 0) tags.forEach((t) => qs.append('tags', t));
    return request<SvgRecord[]>(`/api/svg/search?${qs.toString()}`);
  },

  listTemplates: () => request<TemplateListResponse>('/api/template'),

  getTemplate: (name: string) => request<Template>(`/api/template/${encodeURIComponent(name)}`),

  sessionState: () => request<SessionState>('/api/session/state'),

  updateSessionState: (data: { selected_template?: string | null; template_params?: Record<string, string>; active_rules?: string[]; pending_svg?: string; clear_pending?: boolean }) =>
    request<{ ok: true }>('/api/session/state', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  setReferenceSvg: (ref: { id: string; name: string; svg_content: string } | null) =>
    request<{ ok: true }>('/api/session/reference', {
      method: 'POST',
      body: JSON.stringify({ reference_svg: ref }),
    }),

  createTemplate: (data: {
    name: string;
    description: string;
    category: string;
    reference?: string | null;
    prompt_template: string;
    options: TemplateOption[];
    validation?: { rules: string[]; retry_on_fail: number };
  }) =>
    request<Template>('/api/template', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTemplate: (name: string, data: Template) =>
    request<Template>(`/api/template/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTemplate: (name: string) =>
    request<{ deleted: boolean }>(`/api/template/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }),
};

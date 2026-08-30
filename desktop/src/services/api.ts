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
  collection_id?: string | null;
  frame_index?: number | null;
  record_type?: 'result' | 'asset';
  preset?: IconSpec | null;
}

// ────────────────────────── Icon Studio 设定 ──────────────────────────

export type IconShapeKind =
  | 'square'
  | 'rounded_square'
  | 'circle'
  | 'hexagon'
  | 'octagon'
  | 'diamond'
  | 'free';

export interface IconShape {
  kind: IconShapeKind;
  radius?: number;
}

export interface AspectRatio {
  w: number;
  h: number;
}

export type StrokeAlign = 'inside' | 'center' | 'outside';
export type LineCap = 'butt' | 'round' | 'square';
export type LineJoin = 'miter' | 'round' | 'bevel';

export interface StrokeSpec {
  kind: 'none' | 'line';
  color?: string;
  width?: number;
  dash?: number;
  gap?: number;
  dotted?: boolean;
  double?: boolean;
  align?: StrokeAlign;
  cap?: LineCap;
  join?: LineJoin;
}

export interface BackgroundSpec {
  kind: 'transparent' | 'solid' | 'linear_gradient';
  color?: string;
  from?: string;
  to?: string;
  angle?: number;
}

export type ColorMode = 'full_color' | 'monochrome' | 'duotone' | 'outline' | 'flat' | 'gradient';
export type IconStyle = 'flat' | 'line' | 'filled' | 'duotone' | 'hand_drawn' | 'pixel' | 'gradient' | 'three_d' | 'glass';
export type StrokeWeight = 'hairline' | 'thin' | 'regular' | 'bold' | 'black';
export type DetailLevel = 'minimal' | 'balanced' | 'detailed';
export type GridSnap = 'off' | 'pt2' | 'pt4' | 'pt8';

export interface PaletteSpec {
  mode: ColorMode;
  primary?: string | null;
  secondary?: string | null;
}

export interface StyleSpec {
  style: IconStyle;
  weight: StrokeWeight;
  detail: DetailLevel;
  grid: GridSnap;
}

export interface AnimationSpec {
  enabled: boolean;
  frames: number;
}

export interface IconSpec {
  shape: IconShape;
  rotation: number;
  aspect: AspectRatio;
  base_size: number;
  inset: number;
  safe_area: number;
  overshoot: number;
  optical_shift: number;
  stroke: StrokeSpec;
  background: BackgroundSpec;
  palette: PaletteSpec;
  style: StyleSpec;
  allow_text: boolean;
  animation: AnimationSpec;
}

export interface ReferenceItem {
  name: string;
  hint?: string | null;
}

export type CollectionKind = 'batch' | 'frameset' | 'manual';

export interface CollectionSummary {
  id: string;
  name: string;
  kind: CollectionKind;
  tags: string[];
  preset?: IconSpec | null;
  created_at: string;
  updated_at: string;
  item_count: number;
}

export interface Collection extends CollectionSummary {}

export interface BatchSaveItem {
  name: string;
  svg_content: string;
  frame_index?: number | null;
  tags?: string[];
}

export interface BatchSaveResponse {
  collection: CollectionSummary;
  saved: number;
  failed: string[];
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
  type: 'color' | 'select' | 'text' | 'range' | 'boolean' | 'number' | 'textarea' | 'multiselect';
  key: string;
  label: string;
  default: string;
  options?: string[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
}

export interface TemplateExample {
  svg_content: string;
  description?: string;
  params?: Record<string, string>;
}

export interface Template {
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

  listSvgs: (params?: { offset?: number; limit?: number; sort_by?: string; sort_order?: string; tag?: string; collection_id?: string; record_type?: string; uncollected?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.sort_by) qs.set('sort_by', params.sort_by);
    if (params?.sort_order) qs.set('sort_order', params.sort_order);
    if (params?.tag) qs.set('tag', params.tag);
    if (params?.collection_id) qs.set('collection_id', params.collection_id);
    if (params?.record_type) qs.set('record_type', params.record_type);
    if (params?.uncollected) qs.set('uncollected', 'true');
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
    collection_id?: string;
    frame_index?: number;
    record_type?: string;
    preset?: IconSpec;
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
    examples?: TemplateExample[];
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

  // ────────────────── Icon Studio ──────────────────

  iconApply: (svg: string, spec: IconSpec) =>
    request<{ svg: string; bytes: number }>('/api/icon/apply', {
      method: 'POST',
      body: JSON.stringify({ svg, spec }),
    }),

  iconPrompt: (data: { user_prompt: string; spec: IconSpec; refs?: ReferenceItem[]; frame?: [number, number] }) =>
    request<{ prompt: string }>('/api/icon/prompt', {
      method: 'POST',
      body: JSON.stringify({ ...data, refs: data.refs || [] }),
    }),

  batchSave: (data: {
    collection_name: string;
    kind?: string;
    tags?: string[];
    apply?: boolean;
    spec: IconSpec;
    items: BatchSaveItem[];
  }) =>
    request<BatchSaveResponse>('/api/icon/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ────────────────── Collections ──────────────────

  listCollections: () => request<CollectionSummary[]>('/api/collections'),

  createCollection: (data: { name: string; kind?: string; tags?: string[]; preset?: IconSpec }) =>
    request<Collection>('/api/collections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCollection: (id: string) => request<Collection>(`/api/collections/${encodeURIComponent(id)}`),

  updateCollection: (id: string, data: { name?: string; tags?: string[]; preset?: IconSpec }) =>
    request<Collection>(`/api/collections/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteCollection: (id: string) =>
    request<{ deleted: boolean; items_unbound: boolean }>(`/api/collections/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  listCollectionItems: (id: string) =>
    request<{ items: SvgRecord[]; total: number }>(`/api/collections/${encodeURIComponent(id)}/items`),

  addCollectionItems: (id: string, ids: string[]) =>
    request<{ assigned: number }>(`/api/collections/${encodeURIComponent(id)}/items`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // ────────────────── References (multi) ──────────────────

  getReferences: () => request<{ items: ReferenceItem[] }>('/api/session/references'),

  setReferences: (items: ReferenceItem[]) =>
    request<{ ok: true; count: number }>('/api/session/references', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  addReference: (item: ReferenceItem) =>
    request<{ ok: true; count: number }>('/api/session/references/add', {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  clearReferences: () => request<{ ok: true }>('/api/session/references', { method: 'DELETE' }),
};

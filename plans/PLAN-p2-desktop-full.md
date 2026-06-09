# P2: Electron Desktop Full UI

## Git Branch
`p2-desktop-full`

## Dependencies
- `p1c-desktop-skeleton` (routing + layout)
- `p1b-server` (HTTP/WS connection)

## Deliverables
All P1c skeleton placeholder pages filled with complete UI

## Page Details

### 1. Connection Page `pages/Connection.tsx`

- Port number input (default 8765)
- Start/Stop button
- Status indicator: Red(disconnected) / Yellow(connecting) / Green(ready)
- Log scroll area (Rust process stdout real-time display)
- MCP config snippet display: Claude Code JSON config, one-click copy

Components:
- `ConnectionStatus` — indicator + text
- `PortInput` — port number input
- `LogViewer` — real-time log scroll
- `McpConfigSnippet` — JSON preview + copy button

### 2. SVG Preview Page `pages/Preview.tsx`

- Inline `<svg>` rendering (dangerouslySetInnerHTML + sanitized)
- Source panel (CodeMirror 6, read-only, SVG syntax highlighting)
- Action toolbar: Validate / Render as PNG / Save / Export SVG
- Split layout: left render area | right source code
- Input: paste SVG / drag file / open from repository

Components:
- `SvgViewer` — SVG render area (zoom/pan)
- `SourcePanel` — CodeMirror SVG source
- `ActionToolbar` — validate/render/save/export buttons
- `ValidationResult` — green pass / red error list

### 3. Repository Page `pages/Repository.tsx`

- Grid view (cards with thumbnail + name + tags)
- Search bar (keyword + tag filter + date range)
- Click card → detail panel (source preview + metadata + template source)
- Batch operations: multi-select → delete / export
- Pagination

Components:
- `GridView` — SVG card grid
- `SvgCard` — thumbnail + name + tags
- `DetailPanel` — right slide-out detail
- `SearchBar` — search input + tag selector
- `BatchActionBar` — bottom batch action bar

### 4. Templates Page `pages/Templates.tsx`

- Category browsing: Brand Design / Charts / Illustration / Icons / Infographic
- Template cards: name + description + preview
- Click → template detail: options preview + reference example + validation rules
- Template editor: online .toml editing (CodeMirror, TOML syntax)
- Import template: file picker → copy to template directory
- Create new template: form wizard (basic info → options → validation rules → save)

Components:
- `CategoryNav` — category navigation
- `TemplateCard` — template card
- `TemplateDetail` — template detail panel
- `TemplateEditor` — CodeMirror TOML editor
- `CreateTemplateWizard` — step-by-step creation wizard

### 5. Rules Page `pages/Rules.tsx`

- Built-in rules list (read-only display)
- Custom rules CRUD
- Rule editor: name + type + parameters (form-driven)
- Rule combination: create RuleSet, select multiple rules
- Save as .toml file

Components:
- `RuleList` — rule list
- `RuleEditor` — rule editing form
- `RuleSetManager` — rule combination management
- `RuleTestPanel` — test rules with input SVG

### 6. Settings Page `pages/Settings.tsx`

- Port number (default 8765)
- DB path (display + modify)
- Template directory path + open folder
- Max SVG file size limit
- Theme: Light / Dark / System
- Keyboard shortcuts reference
- About: version / build info

Components:
- `SettingsSection` — settings grouping
- `SettingsInput` — generic input component
- `ThemeSelector` — theme switcher
- `AboutCard` — version info

## Global State (Zustand Stores)

```typescript
interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  port: number;
  pid: number | null;
  logs: string[];
  connect: (port: number) => Promise<void>;
  disconnect: () => Promise<void>;
}

interface SettingsState {
  port: number;
  dbPath: string;
  templateDirs: string[];
  maxSvgSize: number;
  theme: 'light' | 'dark' | 'system';
  update: (key: string, value: any) => void;
  persist: () => Promise<void>;
}
```

## Styles
- Tailwind CSS unified styling
- Dark mode as default (SVG preview looks better on dark backgrounds)
- Sidebar: 240px width, icon + text navigation
- Desktop-focused responsive layout

## Communication with Rust Server

```typescript
// services/api.ts
const api = {
  validate: (svg: string) => POST('/api/validate', { svg }),
  render: (svg: string, opts) => POST('/api/render', { svg, opts }),
  listSvgs: (params) => GET('/api/svg', params),
  saveSvg: (data) => POST('/api/svg', data),
  listTemplates: () => GET('/api/template'),
  getTemplate: (name) => GET(`/api/template/${name}`),
  health: () => GET('/api/health'),
};

// services/ws.ts — WebSocket real-time preview
// Connect to ws://localhost:{port}/ws/preview
// Listen for "preview" events to update render area
```

## Verification
- All page routes navigate correctly
- Connection: start/stop Rust process, log scrolling
- SVG Preview: input SVG code → live render + validation feedback
- Repository: list loading / search / pagination
- Templates: category browse / edit save / file import
- Rules: create/edit/delete custom rules
- Full page dark/light theme switching

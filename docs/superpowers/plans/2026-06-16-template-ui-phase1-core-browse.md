# 模板管理重构 Phase 1: 核心架构 + 浏览模式

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现可扩展的模板面板架构和完整的浏览模式功能

**Architecture:** 
- 新建 TemplatePanel 主容器管理面板状态（展开/收起）和模式切换
- 扩展 templateStore 支持新增状态（选择、视图、筛选）
- BrowseMode 组件实现网格/列表视图、搜索、右键菜单
- 保留现有 LeftPanel 作为后备，渐进式切换

**Tech Stack:** React, TypeScript, Zustand, Tailwind CSS

---

## 文件结构规划

### 新建文件

```
desktop/src/components/template/
├── TemplatePanel.tsx              # 主容器
├── modes/
│   └── BrowseMode.tsx            # 浏览模式
├── components/
│   ├── TemplateCard.tsx          # 模板卡片
│   ├── TemplateGrid.tsx          # 网格布局
│   ├── TemplateList.tsx          # 列表布局
│   ├── TemplateSearch.tsx        # 搜索栏
│   ├── CategorySidebar.tsx       # 分类边栏
│   └── TemplateContextMenu.tsx   # 右键菜单
├── hooks/
│   ├── useTemplateSelection.ts   # 选择逻辑
│   ├── useTemplatePanel.ts       # 面板状态
│   └── useKeyboardShortcuts.ts   # 快捷键
└── utils/
    └── templateUtils.ts          # 工具函数
```

### 修改文件

```
desktop/src/stores/templateStore.ts    # 扩展状态
desktop/src/types/template.ts          # 扩展类型
desktop/src/App.tsx                    # 集成新面板
```

---

## Task 1: 扩展类型定义

**Files:**
- Modify: `desktop/src/types/template.ts`

- [ ] **Step 1: 添加新类型定义**

```typescript
// 在现有类型后添加

export type ViewMode = 'grid' | 'list';
export type SortBy = 'name-asc' | 'name-desc' | 'created' | 'updated' | 'category';
export type PanelMode = 'browse' | 'edit' | 'manage' | 'preview';

export interface TemplateCardAction {
  icon: string;
  label: string;
  onClick: (template: TemplateDefinition) => void;
  variant?: 'default' | 'danger';
}
```

- [ ] **Step 2: 验证类型**

Run: `cd desktop && npm run type-check`
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add desktop/src/types/template.ts
git commit -m "feat(types): add template UI types for panel modes and views"
```

---

## Task 2: 扩展 templateStore

**Files:**
- Modify: `desktop/src/stores/templateStore.ts`

- [ ] **Step 1: 添加新状态字段**

在现有 interface 中添加：

```typescript
interface TemplateState {
  // ... 现有字段
  
  // 面板状态
  panelExpanded: boolean;
  activeMode: PanelMode;
  
  // 视图状态
  viewMode: ViewMode;
  searchQuery: string;
  categoryFilter: string | null;
  sortBy: SortBy;
  
  // 选择状态
  selectedIds: Set<string>;
  lastSelectedId: string | null;
}
```

- [ ] **Step 2: 添加新操作方法（第一部分）**

```typescript
// 在 create 内部添加新方法
togglePanel: () => set(s => { s.panelExpanded = !s.panelExpanded; }),
setMode: (mode: PanelMode) => set(s => {
  s.activeMode = mode;
  if (mode !== 'manage') {
    s.selectedIds.clear();
  }
}),
setViewMode: (mode: ViewMode) => set(s => { s.viewMode = mode; }),
```

- [ ] **Step 3: 添加新操作方法（第二部分）**

```typescript
setSearchQuery: (query: string) => set(s => { s.searchQuery = query; }),
setCategoryFilter: (category: string | null) => set(s => { s.categoryFilter = category; }),
setSortBy: (sort: SortBy) => set(s => { s.sortBy = sort; }),

toggleSelection: (id: string) => set(s => {
  if (s.selectedIds.has(id)) {
    s.selectedIds.delete(id);
  } else {
    s.selectedIds.add(id);
  }
  s.lastSelectedId = id;
}),
```

- [ ] **Step 4: 添加计算方法**

```typescript
getFilteredTemplates: () => {
  const state = get();
  let filtered = state.templates;
  
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }
  
  if (state.categoryFilter) {
    filtered = filtered.filter(t => t.category === state.categoryFilter);
  }
  
  const sorted = [...filtered];
  switch (state.sortBy) {
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
  }
  
  return sorted;
},
```

- [ ] **Step 5: 初始化默认值**

```typescript
// 在 create 的初始状态中添加
panelExpanded: false,
activeMode: 'browse',
viewMode: 'grid',
searchQuery: '',
categoryFilter: null,
sortBy: 'name-asc',
selectedIds: new Set(),
lastSelectedId: null,
```

- [ ] **Step 6: 验证编译**

Run: `cd desktop && npm run build`
Expected: 编译成功

- [ ] **Step 7: Commit**

```bash
git add desktop/src/stores/templateStore.ts
git commit -m "feat(store): extend templateStore with panel and view state"
```

---

## Task 3: 创建工具函数

**Files:**
- Create: `desktop/src/components/template/utils/templateUtils.ts`

- [ ] **Step 1: 创建工具函数文件**

```typescript
import type { TemplateDefinition } from '@/types/template';

export function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    brand: '🎨',
    chart: '📊',
    illustration: '🎭',
    icon: '⭐',
    infographic: '📈',
  };
  return iconMap[category] || '📄';
}

export function getCategoryGradient(category: string): string {
  const gradientMap: Record<string, string> = {
    brand: 'from-purple-500 to-pink-500',
    chart: 'from-blue-500 to-cyan-500',
    illustration: 'from-orange-500 to-red-500',
    icon: 'from-green-500 to-teal-500',
    infographic: 'from-indigo-500 to-purple-500',
  };
  return gradientMap[category] || 'from-gray-400 to-gray-500';
}

export function getCategoryLabel(category: string): string {
  const labelMap: Record<string, string> = {
    brand: '品牌标志',
    chart: '数据图表',
    illustration: '插画',
    icon: '图标',
    infographic: '信息图',
  };
  return labelMap[category] || category;
}

export function groupByCategory(templates: TemplateDefinition[]): Map<string, TemplateDefinition[]> {
  const grouped = new Map<string, TemplateDefinition[]>();
  
  templates.forEach(t => {
    const cat = t.category || 'general';
    if (!grouped.has(cat)) {
      grouped.set(cat, []);
    }
    grouped.get(cat)!.push(t);
  });
  
  return grouped;
}
```

- [ ] **Step 2: Commit**

```bash
git add desktop/src/components/template/utils/templateUtils.ts
git commit -m "feat(utils): add template utility functions"
```

---


## Task 4: 创建 useTemplatePanel Hook

**Files:**
- Create: `desktop/src/components/template/hooks/useTemplatePanel.ts`

- [ ] **Step 1: 创建 Hook 文件**

```typescript
import { useTemplateStore } from '@/stores/templateStore';
import type { PanelMode } from '@/types/template';

export function useTemplatePanel() {
  const panelExpanded = useTemplateStore(s => s.panelExpanded);
  const activeMode = useTemplateStore(s => s.activeMode);
  const togglePanel = useTemplateStore(s => s.togglePanel);
  const setMode = useTemplateStore(s => s.setMode);

  const expandPanel = () => {
    if (!panelExpanded) togglePanel();
  };

  const collapsePanel = () => {
    if (panelExpanded) togglePanel();
  };

  const switchToMode = (mode: PanelMode) => {
    expandPanel();
    setMode(mode);
  };

  return {
    panelExpanded,
    activeMode,
    togglePanel,
    expandPanel,
    collapsePanel,
    switchToMode,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add desktop/src/components/template/hooks/useTemplatePanel.ts
git commit -m "feat(hooks): add useTemplatePanel hook"
```


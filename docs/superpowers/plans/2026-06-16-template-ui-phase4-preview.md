# Phase 4: 预览模式实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现模板预览和快速应用功能

**Architecture:** 
- PreviewMode 组件展示静态示例和参数配置
- 示例图从模板的 examples 字段读取
- 参数调整仅更新提示词预览，不生成实际 SVG
- 快速选择器支持键盘导航

**Tech Stack:** React, TypeScript, Zustand, Tailwind CSS

**依赖**: Phase 1 核心架构，Phase 2 示例数据结构

---

## 任务概要

### Task 1: 创建 ExampleViewer 组件
**目标**: 显示 SVG 示例的大图区域

**关键步骤**:
- [ ] 创建示例查看器组件
- [ ] 接收 SVG 内容并渲染
- [ ] 居中显示，固定尺寸（400x300）
- [ ] 空状态占位符（无示例时）
- [ ] 样式和边框
- [ ] Commit

**Files**:
- Create: `desktop/src/components/template/components/ExampleViewer.tsx`

**核心实现**:
```typescript
interface ExampleViewerProps {
  svgContent: string | null;
  description?: string;
}

export default function ExampleViewer({ svgContent, description }: ExampleViewerProps) {
  if (!svgContent) {
    return (
      <div className="w-full h-[300px] border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="text-4xl mb-2">🖼️</div>
          <div className="text-sm">暂无示例图</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
      <div 
        className="w-full h-[300px] flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      {description && (
        <div className="mt-2 text-xs text-slate-600 text-center">{description}</div>
      )}
    </div>
  );
}
```

---

### Task 2: 创建 ExampleThumbnailList 组件
**目标**: 示例缩略图横向列表

**关键步骤**:
- [ ] 创建缩略图列表组件
- [ ] 横向滚动布局
- [ ] 缩略图尺寸 80x80
- [ ] 点击切换当前查看的示例
- [ ] 显示参数说明
- [ ] 选中状态高亮
- [ ] Commit

**Files**:
- Create: `desktop/src/components/template/components/ExampleThumbnailList.tsx`

**核心实现**:
```typescript
interface ExampleThumbnailListProps {
  examples: TemplateExample[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export default function ExampleThumbnailList({
  examples,
  activeIndex,
  onSelect
}: ExampleThumbnailListProps) {
  return (
    <div className="flex gap-2 overflow-x-auto py-2">
      {examples.map((example, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(idx)}
          className={`
            flex-shrink-0 w-20 h-20 border-2 rounded-lg overflow-hidden
            ${idx === activeIndex ? 'border-blue-500' : 'border-slate-300 hover:border-blue-300'}
          `}
        >
          <div 
            className="w-full h-full scale-[0.25]"
            dangerouslySetInnerHTML={{ __html: example.svg_content }}
          />
        </button>
      ))}
    </div>
  );
}
```

---

### Task 3: 创建 PreviewParamPanel 组件
**目标**: 参数配置面板（不生成 SVG）

**关键步骤**:
- [ ] 创建参数配置组件
- [ ] 复用现有 OptionField 组件渲染参数
- [ ] 参数值变化时更新 store
- [ ] 添加提示：仅更新提示词预览
- [ ] Commit

**Files**:
- Create: `desktop/src/components/template/components/PreviewParamPanel.tsx`

**核心实现**:
```typescript
interface PreviewParamPanelProps {
  template: TemplateDefinition;
  params: Record<string, string>;
  onParamChange: (key: string, value: string) => void;
}

export default function PreviewParamPanel({
  template,
  params,
  onParamChange
}: PreviewParamPanelProps) {
  return (
    <div className="border-t border-slate-200 pt-4">
      <div className="text-sm font-semibold text-slate-700 mb-2">参数配置</div>
      
      <div className="space-y-3">
        {template.options.map((opt) => (
          <OptionField
            key={opt.key}
            option={opt}
            value={params[opt.key] || opt.default || ''}
            onChange={(v) => onParamChange(opt.key, v)}
          />
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
        <span>💡</span>
        <span>调整参数仅更新提示词预览，在工作台生成实际 SVG</span>
      </div>
    </div>
  );
}
```

---

### Task 4: 创建 PromptPreview 组件
**目标**: 编译后提示词预览框

**关键步骤**:
- [ ] 创建提示词预览组件
- [ ] 实时编译模板变量
- [ ] 只读文本框，可复制
- [ ] 样式（紫色边框，代码风格）
- [ ] Commit

**Files**:
- Create: `desktop/src/components/template/components/PromptPreview.tsx`

**核心实现**:
```typescript
interface PromptPreviewProps {
  template: TemplateDefinition;
  params: Record<string, string>;
}

export default function PromptPreview({ template, params }: PromptPreviewProps) {
  const compiledPrompt = useMemo(() => {
    let result = template.prompt_template;
    template.options.forEach((opt) => {
      const value = params[opt.key] || opt.default || '';
      result = result.replace(new RegExp(`{{${opt.key}}}`, 'g'), value);
    });
    return result;
  }, [template, params]);

  return (
    <div className="border-t border-slate-200 pt-4">
      <div className="text-sm font-semibold text-slate-700 mb-2">编译后提示词</div>
      <textarea
        value={compiledPrompt}
        readOnly
        className="w-full h-32 px-3 py-2 border-2 border-violet-200 bg-violet-50/50 rounded-lg text-sm font-mono resize-none focus:outline-none"
      />
    </div>
  );
}
```

---

### Task 5: 创建 TemplateQuickPicker 组件
**目标**: 快速选择模板的下拉/搜索器

**关键步骤**:
- [ ] 创建快速选择器组件
- [ ] 下拉显示模板列表（按分类分组）
- [ ] 支持搜索过滤
- [ ] 键盘导航（上下箭头、Enter）
- [ ] Ctrl+P 快捷键打开
- [ ] Commit

**Files**:
- Create: `desktop/src/components/template/components/TemplateQuickPicker.tsx`

**核心实现**:
```typescript
interface TemplateQuickPickerProps {
  templates: TemplateDefinition[];
  value: string | null;
  onChange: (templateName: string) => void;
  onClose: () => void;
}

export default function TemplateQuickPicker({
  templates,
  value,
  onChange,
  onClose
}: TemplateQuickPickerProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    if (!query) return templates;
    const q = query.toLowerCase();
    return templates.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }, [templates, query]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onChange(filtered[selectedIndex].name);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtered, selectedIndex, onChange, onClose]);

  return (
    <div className="fixed inset-0 bg-black/20 flex items-start justify-center pt-32 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          autoFocus
          placeholder="搜索模板..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-3 border-b border-slate-200 text-lg focus:outline-none"
        />
        <div className="max-h-96 overflow-y-auto">
          {filtered.map((tmpl, idx) => (
            <button
              key={tmpl.name}
              onClick={() => { onChange(tmpl.name); onClose(); }}
              className={`
                w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-3
                ${idx === selectedIndex ? 'bg-blue-50' : ''}
              `}
            >
              <div className={`w-8 h-8 rounded bg-gradient-to-br ${getCategoryGradient(tmpl.category)} flex items-center justify-center text-sm`}>
                {getCategoryIcon(tmpl.category)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{tmpl.name}</div>
                <div className="text-xs text-slate-500">{tmpl.category}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### Task 6: 创建 PreviewMode 主组件
**目标**: 预览模式容器

**关键步骤**:
- [ ] 创建 PreviewMode 组件
- [ ] 上下分栏布局
- [ ] 顶部模板选择器
- [ ] 集成 ExampleViewer
- [ ] 集成 ExampleThumbnailList
- [ ] 集成 PreviewParamPanel
- [ ] 集成 PromptPreview
- [ ] 底部"应用到工作台"按钮
- [ ] Commit

**Files**:
- Create: `desktop/src/components/template/modes/PreviewMode.tsx`

**核心实现**:
```typescript
export default function PreviewMode() {
  const templates = useTemplateStore(s => s.templates);
  const selectedTemplate = useTemplateStore(s => s.selectedTemplate);
  const templateParams = useTemplateStore(s => s.templateParams);
  const setTemplates = useTemplateStore(s => s.setTemplates);
  const setParams = useTemplateStore(s => s.setParams);
  
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);
  const [showQuickPicker, setShowQuickPicker] = useState(false);

  const currentTemplate = templates.find(t => t.name === selectedTemplate);
  const examples = currentTemplate?.examples || [];
  const activeExample = examples[activeExampleIndex];

  // Ctrl+P 打开快速选择器
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setShowQuickPicker(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleApplyToWorkspace = () => {
    // 关闭面板
    useTemplateStore.setState({ panelExpanded: false });
    // 选中的模板和参数已经在 store 中，工作台直接使用
    toast.success('已应用到工作台，可以生成 SVG');
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto">
      {/* 顶部模板选择器 */}
      <div className="mb-4">
        <label className="text-sm font-semibold text-slate-700 block mb-2">选择模板</label>
        <button
          onClick={() => setShowQuickPicker(true)}
          className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-left hover:border-blue-400 flex items-center justify-between"
        >
          <span>{currentTemplate?.name || '请选择模板'}</span>
          <span className="text-slate-400">▼</span>
        </button>
      </div>

      {currentTemplate ? (
        <>
          {/* 示例大图 */}
          <ExampleViewer
            svgContent={activeExample?.svg_content || null}
            description={activeExample?.description}
          />

          {/* 示例缩略图列表 */}
          {examples.length > 0 && (
            <div className="mt-4">
              <ExampleThumbnailList
                examples={examples}
                activeIndex={activeExampleIndex}
                onSelect={setActiveExampleIndex}
              />
            </div>
          )}

          {/* 参数配置 */}
          <PreviewParamPanel
            template={currentTemplate}
            params={templateParams}
            onParamChange={(key, value) => setParams({ ...templateParams, [key]: value })}
          />

          {/* 提示词预览 */}
          <PromptPreview template={currentTemplate} params={templateParams} />

          {/* 应用按钮 */}
          <button
            onClick={handleApplyToWorkspace}
            className="mt-4 w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            应用到工作台
          </button>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <div className="text-4xl mb-2">🎯</div>
            <div className="text-sm">请选择一个模板进行预览</div>
            <div className="text-xs mt-2">快捷键: Ctrl+P</div>
          </div>
        </div>
      )}

      {/* 快速选择器 */}
      {showQuickPicker && (
        <TemplateQuickPicker
          templates={templates}
          value={selectedTemplate}
          onChange={(name) => {
            const tmpl = templates.find(t => t.name === name);
            if (tmpl) {
              setTemplates(tmpl);
              setActiveExampleIndex(0);
            }
          }}
          onClose={() => setShowQuickPicker(false)}
        />
      )}
    </div>
  );
}
```

---

### Task 7: 扩展快捷键支持
**目标**: 添加预览模式快捷键

**关键步骤**:
- [ ] Ctrl+P - 打开快速选择器
- [ ] Enter - 应用到工作台
- [ ] Esc - 关闭快速选择器
- [ ] 在 useKeyboardShortcuts 中实现
- [ ] Commit

**Files**:
- Modify: `desktop/src/components/template/hooks/useKeyboardShortcuts.ts`

---

### Task 8: 集成到 TemplatePanel
**目标**: 将预览模式加入面板

**关键步骤**:
- [ ] 在 TemplatePanel 导入 PreviewMode
- [ ] 添加预览模式路由
- [ ] 测试模式切换
- [ ] Commit

**Files**:
- Modify: `desktop/src/components/template/TemplatePanel.tsx`

---

### Task 9: 端到端测试
**目标**: 测试完整的预览流程

**关键步骤**:
- [ ] 测试模板选择（下拉和快速选择器）
- [ ] 测试示例切换
- [ ] 测试参数调整和提示词实时编译
- [ ] 测试应用到工作台
- [ ] 测试快捷键（Ctrl+P, Enter, Esc）
- [ ] 测试空状态（无示例、无参数）
- [ ] 修复发现的问题
- [ ] Commit

---

### Task 10: 文档和提交
**目标**: 记录预览模式

**关键步骤**:
- [ ] 更新组件文档
- [ ] 记录快捷键
- [ ] 使用说明
- [ ] 最终 commit

---

## 依赖关系

```
Task 1 (ExampleViewer) ─┐
Task 2 (ThumbnailList)  ├─→ Task 6 (PreviewMode)
Task 3 (ParamPanel)     │
Task 4 (PromptPreview)  ┘

Task 5 (QuickPicker) ───→ Task 6 (PreviewMode)

Task 6 ──→ Task 8 (集成)

Task 7 (快捷键) ──→ Task 9 (测试)

Task 8 ──→ Task 9 (测试)
```

**可并行执行**:
- Task 1-5 (所有子组件)

---

## 预估时间

- Task 1-5: 1-1.5 天
- Task 6-8: 0.5-1 天
- Task 9-10: 0.5 天
- **总计**: 2-3 天

---

## 成功标准

- ✅ 可以选择模板进行预览
- ✅ 示例图正确显示和切换
- ✅ 参数调整实时更新提示词预览
- ✅ 快速选择器支持搜索和键盘导航
- ✅ 应用到工作台功能正常
- ✅ 所有快捷键生效
- ✅ 空状态友好提示

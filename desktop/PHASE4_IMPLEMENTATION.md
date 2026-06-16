# Phase 4 预览模式实施文档

## 概述
Phase 4 实现了完整的模板预览功能，允许用户在侧边面板中浏览模板、查看示例、调整参数并预览编译后的提示词。

## 架构设计

### 组件层次结构
```
TemplatePanel (主容器)
├── 模式标签 (浏览/预览/编辑/管理)
└── PreviewMode (预览模式)
    ├── 模板选择器
    │   └── TemplateQuickPicker (快速选择器)
    ├── ExampleViewer (示例查看器)
    ├── ExampleThumbnailList (缩略图列表)
    ├── PreviewParamPanel (参数面板)
    ├── PromptPreview (提示词预览)
    └── 应用按钮
```

### 状态管理
使用 Zustand templateStore 管理：
- `panelExpanded`: 面板展开状态
- `activeMode`: 当前模式 (browse/preview/edit/manage)
- `selectedTemplate`: 选中的模板名称
- `templateParams`: 模板参数值

## 核心组件

### 1. ExampleViewer
**文件**: `desktop/src/components/template/components/ExampleViewer.tsx`

显示 SVG 示例的大图区域。
- 固定尺寸 400x300
- 使用 `dangerouslySetInnerHTML` 渲染 SVG
- 支持可选的描述文本
- 空状态显示友好占位符

### 2. ExampleThumbnailList
**文件**: `desktop/src/components/template/components/ExampleThumbnailList.tsx`

横向滚动的示例缩略图列表。
- 80x80 缩略图尺寸
- 当前选中项高亮
- 支持点击切换
- 自动隐藏（无示例时）

### 3. PreviewParamPanel
**文件**: `desktop/src/components/template/components/PreviewParamPanel.tsx`

参数配置面板，支持所有参数类型：
- `color`: 颜色选择器
- `select`: 下拉选择框
- `text`: 文本输入框
- `range`: 范围滑块

显示提示信息：参数调整仅更新提示词预览，需在工作台生成实际 SVG。

### 4. PromptPreview
**文件**: `desktop/src/components/template/components/PromptPreview.tsx`

编译后的提示词预览。
- 使用 `useMemo` 实时编译
- 只读文本框，支持复制
- 紫色边框样式
- 自动替换模板变量 `{{key}}`

### 5. TemplateQuickPicker
**文件**: `desktop/src/components/template/components/TemplateQuickPicker.tsx`

快速模板选择器（Ctrl+P）。
- 模态对话框
- 实时搜索过滤
- 键盘导航（↑↓ Enter Esc）
- 按分类分组显示
- 自动滚动到选中项

### 6. PreviewMode
**文件**: `desktop/src/components/template/modes/PreviewMode.tsx`

预览模式主组件，集成所有子组件。
- 模板选择
- 示例查看和切换
- 参数编辑
- 提示词实时预览
- 应用到工作台

### 7. TemplatePanel
**文件**: `desktop/src/components/template/TemplatePanel.tsx`

模板面板主容器。
- 固定在右侧的覆盖层
- 宽度 384px
- 模式切换标签
- 关闭按钮

## 类型定义

### TemplateExample
```typescript
export interface TemplateExample {
  svg_content: string;
  description?: string;
  params?: Record<string, string>;
}
```

### TemplateDefinition (扩展)
```typescript
export interface TemplateDefinition {
  // ... 现有字段
  examples?: TemplateExample[];
}
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+P | 打开快速模板选择器 |
| ↑ | 向上导航 |
| ↓ | 向下导航 |
| Enter | 选择当前项 |
| Esc | 关闭选择器 |

## 集成点

### App.tsx
- 导入 TemplatePanel
- 渲染面板组件
- 添加打开面板处理器

### TopBar.tsx
- 添加模板面板按钮
- 绑定点击处理器

## 使用流程

1. **打开面板**
   - 点击顶部栏的模板按钮
   - 面板从右侧滑出，默认显示预览模式

2. **选择模板**
   - 点击模板选择框
   - 或按 Ctrl+P 打开快速选择器
   - 搜索或浏览模板列表
   - 选择目标模板

3. **查看示例**
   - 大图区域显示当前示例
   - 点击缩略图切换不同示例

4. **调整参数**
   - 修改参数值
   - 实时查看提示词变化

5. **应用到工作台**
   - 点击"应用到工作台"按钮
   - 面板关闭
   - 模板和参数保存到 store
   - 工作台可以使用选中的配置生成 SVG

## 样式约定

### 颜色
- 主色：蓝色 (blue-500, blue-600)
- 边框：slate-200
- 文字：slate-600, slate-700, slate-800
- 提示词预览：violet-200, violet-50

### 间距
- 面板内边距：p-4
- 组件间距：space-y-3, gap-2
- 按钮内边距：px-3 py-2

### 圆角
- 按钮/输入框：rounded-lg
- 卡片：rounded-lg

## 性能优化

1. **useMemo** - 提示词编译缓存
2. **useEffect 依赖** - 精确控制重新渲染
3. **条件渲染** - 仅渲染当前模式
4. **虚拟滚动** - 大量模板时考虑实现

## 待完成功能

### Phase 5 - 编辑模式
- 创建/编辑模板表单
- 实时预览

### Phase 6 - 管理模式
- 批量操作
- 导入/导出
- 删除/复制

## 故障排查

### TypeScript 错误
- 确保所有组件导入正确的类型
- 检查 TemplateExample 接口使用

### 面板不显示
- 检查 `panelExpanded` 状态
- 验证 TemplatePanel 已添加到 App.tsx

### 快捷键不生效
- 确保事件监听器正确添加
- 检查是否有其他组件拦截事件

### 示例图不显示
- 验证 SVG 内容格式正确
- 检查 `dangerouslySetInnerHTML` 使用

## 维护建议

1. 定期审查 TypeScript 类型安全
2. 监控面板性能（大量模板）
3. 收集用户反馈改进 UX
4. 考虑添加加载状态
5. 实现撤销/重做功能

## 相关文件

### 新增文件
- `desktop/src/components/template/TemplatePanel.tsx`
- `desktop/src/components/template/modes/PreviewMode.tsx`
- `desktop/src/components/template/components/ExampleViewer.tsx`
- `desktop/src/components/template/components/ExampleThumbnailList.tsx`
- `desktop/src/components/template/components/PreviewParamPanel.tsx`
- `desktop/src/components/template/components/PromptPreview.tsx`
- `desktop/src/components/template/components/TemplateQuickPicker.tsx`

### 修改文件
- `desktop/src/types/template.ts` - 添加 TemplateExample 接口
- `desktop/src/App.tsx` - 集成 TemplatePanel
- `desktop/src/components/layout/TopBar.tsx` - 添加模板按钮
- `desktop/src/components/template/components/ExampleManager.tsx` - 修复类型错误

## 提交记录

1. `fc4d4aa` - ExampleViewer 组件
2. `7a12728` - ExampleThumbnailList 组件和类型定义
3. `2a7b320` - PreviewParamPanel 组件
4. `ec4d0d5` - PromptPreview 组件
5. `28bb6dd` - TemplateQuickPicker 组件
6. `112a087` - PreviewMode 主组件
7. `d8e0b37` - TemplatePanel 容器
8. `a6e9784` - App 集成
9. `386c12a` - 类型错误修复

# 桌面端模板管理系统重构设计

**日期**: 2026-06-16  
**版本**: 1.0  
**状态**: 设计阶段

---

## 1. 项目概述

### 1.1 目标

全面重构桌面端模板管理系统，提供专业的模板浏览、编辑、管理和预览功能，同时优化代码结构和用户体验。

### 1.2 核心需求

基于用户需求调研，系统需要同时满足：

- **浏览场景**: 快速找到需要的模板
- **编辑场景**: 创建和定制模板
- **管理场景**: 组织、分类、清理大量模板
- **预览场景**: 查看模板效果和参数影响

### 1.3 设计原则

- **专注工作区**: 通过多视图切换，为每个场景提供优化的界面
- **精简信息**: 默认显示核心信息，悬停或展开查看详情
- **渐进增强**: 先实现核心功能，预留扩展空间
- **保持上下文**: 可以边管理模板边查看预览效果

---

## 2. 整体架构

### 2.1 面板状态系统

左侧模板面板支持三种状态：

| 状态 | 宽度 | 用途 | 触发方式 |
|------|------|------|----------|
| **窄态** | 288px | 默认状态，显示精简模板列表 | 默认 / 点击收起按钮 |
| **宽态** | 700px | 工作区模式，支持四种专业功能 | 点击展开按钮 / Ctrl+B |
| **过渡** | 300ms ease-in-out | 流畅的展开/收起动画 | 自动 |

**状态存储**: 
- 保存在 `templateStore.panelExpanded`
- 刷新后恢复上次状态
- 点击"创建模板"自动展开并进入编辑模式

### 2.2 四种工作模式

宽态面板顶部显示模式切换标签：

```
┌─────────────────────────────────────────┐
│ [🔍 浏览] [✏️ 编辑] [📦 管理] [👁️ 预览] │
├─────────────────────────────────────────┤
│                                          │
│          模式对应的工作区内容             │
│                                          │
└─────────────────────────────────────────┘
```

| 模式 | 图标 | 主要功能 | 默认状态 |
|------|------|----------|----------|
| 浏览 | 🔍 | 网格/列表视图、搜索、筛选、排序 | ✓ |
| 编辑 | ✏️ | 创建/修改模板、参数配置 | - |
| 管理 | 📦 | 批量选择、删除、导出、改分类 | - |
| 预览 | 👁️ | 静态示例、参数调整、提示词预览 | - |

**模式切换**:
- 点击顶部标签切换
- 状态保存在 `templateStore.activeMode`
- 切换时保持当前选中的模板

---

## 3. 浏览模式设计

### 3.1 界面布局

```
┌─────────────────────────────────────────┐
│ [🔍 搜索...        ] [⊞网格] [☰] [排序▼] │  ← 工具栏
├─────────────────────────────────────────┤
│ [分类]  │  模板卡片网格/列表              │  ← 主内容区
│ 品牌 (5)│  ┌───┐ ┌───┐ ┌───┐            │
│ 图表 (3)│  │ 卡 │ │ 卡 │ │ 卡 │            │
│ 插画 (8)│  └───┘ └───┘ └───┘            │
└─────────────────────────────────────────┘
```

**分类边栏** (120px 宽):
- 可折叠分类树
- 显示每个分类的模板数量
- 点击分类自动筛选
- "全部"选项显示所有模板

**视图切换**:
- **网格视图**: 3列，每卡 200px 宽，16px 间距
- **列表视图**: 单列，显示更多信息

### 3.2 模板卡片设计

**精简卡片结构** (网格视图):

```
┌──────────────────┐
│  [图标 48x48]    │  ← 渐变背景 + emoji
│  模板名称        │  ← 14px 粗体
│  [分类标签]      │  ← 11px 小标签
│           ⋮      │  ← 右上角：更多菜单（悬停显示）
└──────────────────┘
```

**视觉规范**:
- 边框: 2px solid #e2e8f0
- 圆角: 12px
- 内边距: 16px
- 悬停: 边框变蓝 (#3b82f6)，上浮 2px
- 选中: 蓝色边框加粗，背景淡蓝 (#eff6ff)

**图标生成规则**:
- 从模板分类映射到渐变色
- 品牌: purple-pink 渐变 + 🎨
- 图表: blue-cyan 渐变 + 📊
- 插画: orange-red 渐变 + 🎭
- 图标: green-teal 渐变 + ⭐
- 其他: gray 渐变 + 📄

**悬停效果**:
- 显示底部快速操作栏:
  ```
  [✏️ 编辑] [📋 复制] [🗑️ 删除]
  ```
- 底部渐入显示描述文字（最多 2 行）

### 3.3 右键菜单

模板卡片右键显示上下文菜单：

1. ✏️ **编辑模板** - 切换到编辑模式
2. 📋 **复制模板** - 创建副本（名称自动加 "-副本"）
3. 🗑️ **删除模板** - 确认后删除
4. 📤 **导出 JSON** - 下载单个模板的 JSON 文件
5. --- (分隔线)
6. 📌 **设为参考** - 设置为当前会话的参考模板
7. 👁️ **查看详情** - 切换到预览模式
8. 🏷️ **修改分类** - 快速改变分类
9. ✂️ **重命名** - 原地编辑名称

**实现方式**:
- 使用原生 `contextmenu` 事件
- 自定义菜单组件（TemplateContextMenu.tsx）
- 点击外部自动关闭

### 3.4 搜索和筛选

**搜索框**:
- 实时搜索（防抖 300ms）
- 匹配范围: 名称、描述、分类
- 显示匹配结果数量
- 快捷键: `Ctrl+F` 聚焦搜索框
- `Esc` 清空搜索

**排序选项**:
- 名称 A-Z
- 名称 Z-A
- 最近创建
- 最近修改
- 分类

---

## 4. 编辑模式设计

### 4.1 编辑器布局

**左右分栏** (700px 面板内):

```
┌─────────────────────────────────────────┐
│ [← 返回]            [保存] [取消]       │  ← 顶部操作栏
├──────────────────┬──────────────────────┤
│ 表单区 (400px)   │ 预览区 (300px)       │
│                  │                       │
│ 基本信息          │ 编译后提示词预览     │
│ • 名称           │ ┌─────────────────┐  │
│ • 描述           │ │ Generate a      │  │
│ • 分类           │ │ {{color}} SVG   │  │
│                  │ │ with {{size}}   │  │
│ 提示词模板       │ └─────────────────┘  │
│ [文本框]         │                       │
│                  │ 参数变量列表          │
│ 参数配置         │ • {{color}}          │
│ [参数列表]       │ • {{size}}           │
│ + 添加参数       │ • {{type}}           │
│                  │                       │
│ 示例管理 (新增)  │                       │
│ [示例缩略图]     │                       │
│ + 添加示例       │                       │
└──────────────────┴──────────────────────┘
```

### 4.2 表单字段

**基本信息**:

| 字段 | 类型 | 规则 | 说明 |
|------|------|------|------|
| 模板名称 | 输入框 | 必填，唯一 | 实时校验重名，显示红色提示 |
| 描述 | 多行文本 | 选填 | 60px 高，最多 200 字符 |
| 分类 | 下拉选择 | 必填 | 可输入新分类，支持模糊搜索 |

**提示词模板**:
- 代码编辑器风格文本框（120px 高）
- 支持 `{{variable}}` 语法高亮（紫色背景）
- 底部自动检测：显示"检测到 3 个参数变量"
- 未定义的变量显示警告图标

### 4.3 参数配置器

**参数列表** (可拖拽排序):

每个参数项显示：
```
┌─────────────────────────────────────────┐
│ [⋮⋮] color - 颜色选择器           [×]  │
│      默认值: #3b82f6                    │
├─────────────────────────────────────────┤
│ [⋮⋮] size - 范围滑块              [×]  │
│      默认值: 100  (范围: 50-500)        │
├─────────────────────────────────────────┤
│ [⋮⋮] type - 下拉选择              [×]  │
│      默认值: modern                     │
│      选项: modern, classic, minimal     │
└─────────────────────────────────────────┘
```

- [⋮⋮] 拖拽手柄，可上下调整顺序
- [×] 删除按钮（确认后删除）
- 点击整个参数项展开详细编辑

**添加参数流程**:
1. 点击"+ 添加参数"按钮
2. 展开内联表单：
   ```
   类型: [颜色▼] [选择] [文本] [范围]
   Key:  [______]  ← 仅字母数字下划线
   Label: [______]  ← 显示名称
   默认值: [______]
   
   [取消] [添加]
   ```
3. 根据类型显示特定配置：
   - **颜色**: 无额外配置
   - **选择**: 选项列表（逗号分隔或多行）
   - **文本**: 占位符文本
   - **范围**: min, max, step

### 4.4 示例管理（新增功能）

**示例列表**:
```
┌─────────────────────────────────────────┐
│ 示例管理                                 │
├─────────────────────────────────────────┤
│ [缩略图1]  [缩略图2]  [缩略图3]          │
│  蓝色大尺寸  红色小尺寸  默认配置        │
│  [×]         [×]         [×]             │
├─────────────────────────────────────────┤
│ + 添加示例                               │
└─────────────────────────────────────────┘
```

**添加示例流程**:
1. 点击"+ 添加示例"
2. 弹出对话框：
   - 方式 A: 粘贴 SVG 代码
   - 方式 B: 从历史记录选择（调用 API 获取）
3. 记录当前参数配置作为说明
4. 生成缩略图预览（缩放到 80x80）

**数据存储**:
```typescript
interface Template {
  // ... 现有字段
  examples?: TemplateExample[];  // 新增
}

interface TemplateExample {
  svg_content: string;           // SVG 代码
  params: Record<string, string>; // 参数配置
  description: string;            // 自动生成或手动编辑
}
```

### 4.5 实时验证

**保存前检查**:

| 检查项 | 错误提示 | 阻止保存 |
|--------|----------|----------|
| 名称为空 | "模板名称不能为空" | ✓ |
| 名称重复 | "已存在同名模板" | ✓ |
| 未定义变量 | "提示词中的 {{xxx}} 未在参数列表中定义" | ✓ |
| 无参数 | "建议至少定义一个参数" | ✗ (警告) |

**快捷键**:
- `Ctrl+S` - 保存并返回浏览模式
- `Ctrl+N` - 保存当前并创建新模板
- `Esc` - 取消编辑，提示"有未保存的更改，确定离开？"

---

## 5. 管理模式设计

### 5.1 批量操作界面

**顶部工具栏**:
```
┌─────────────────────────────────────────┐
│ [☑ 已选 3 项]  [全选] [反选] [清除]    │
├─────────────────────────────────────────┤
│ 批量操作:                                │
│ [🗑️ 删除] [📤 导出] [🏷️ 改分类]       │
│                                          │
│ 即将推出:                                │
│ [🔒 启用/禁用] [✓ 批量验证] [📋 复制]  │
│ (灰色不可点击)                           │
└─────────────────────────────────────────┘
```

**选择状态栏**:
- 显示已选数量
- 快速操作按钮（全选、反选、清除）
- 选择为空时不显示批量操作区域

### 5.2 选择交互

**选择方式**:

| 操作 | 效果 |
|------|------|
| 点击卡片 | 单选/取消选择 |
| Ctrl + 点击 | 多选（保持已选项） |
| Shift + 点击 | 范围选择（从上次点击到当前） |
| Ctrl + A | 全选当前筛选结果 |
| Esc | 清除所有选择 |

**视觉反馈**:
- 选中状态: 蓝色边框 + 右上角勾选图标
- 悬停未选中: 灰色边框高亮
- 选择计数: 实时更新顶部"已选 N 项"

**状态管理**:
```typescript
// templateStore 新增
selectedIds: Set<string>;

// 操作方法
toggleSelection: (id: string) => void;
selectRange: (fromId: string, toId: string) => void;
selectAll: () => void;
clearSelection: () => void;
```

### 5.3 批量操作实现（第一版）

#### 5.3.1 批量删除

**流程**:
1. 选中多个模板
2. 点击"删除"或按 `Delete` 键
3. 显示确认对话框：
   ```
   ┌─────────────────────────────────┐
   │ 确定要删除 3 个模板吗？          │
   │                                  │
   │ • 品牌标志-A                     │
   │ • 数据图表-B                     │
   │ • 插画图标-C                     │
   │                                  │
   │ 此操作无法撤销。                 │
   │                                  │
   │        [取消]  [删除]            │
   └─────────────────────────────────┘
   ```
4. 确认后并发删除（Promise.all）
5. 显示结果 toast：
   - 成功: "已删除 3 个模板"
   - 部分失败: "已删除 2 个，1 个失败：xxx"
6. 刷新列表并清除选择

#### 5.3.2 批量导出

**流程**:
1. 选中多个模板
2. 点击"导出"按钮
3. 生成导出数据：
   ```typescript
   {
     version: "1.0",
     exported_at: "2026-06-16T10:30:00Z",
     templates: [
       { /* 模板1 JSON */ },
       { /* 模板2 JSON */ },
       { /* 模板3 JSON */ }
     ]
   }
   ```
4. 打包为 ZIP 文件：
   - `manifest.json` - 导出元信息
   - `template-1.json` - 各模板文件
   - `template-2.json`
   - `template-3.json`
5. 浏览器下载：`templates-export-20260616.zip`

**技术实现**:
- 使用 JSZip 库打包
- 使用 file-saver 库触发下载

#### 5.3.3 批量改分类

**流程**:
1. 选中多个模板
2. 点击"改分类"按钮
3. 弹出下拉选择器：
   ```
   ┌─────────────────────────────────┐
   │ 选择新分类:                      │
   │                                  │
   │ [品牌       ▼]                   │
   │  品牌                            │
   │  图表                            │
   │  插画                            │
   │  ─────────                       │
   │  + 创建新分类...                 │
   │                                  │
   │        [取消]  [应用]            │
   └─────────────────────────────────┘
   ```
4. 选择或输入新分类名
5. 并发更新所有选中模板
6. 刷新列表并保持选择

### 5.4 导入功能

**导入入口**:
- 位置: 浏览模式顶部工具栏
- 按钮: `[📥 导入]`
- 支持格式: `.json` (单个), `.zip` (批量)

**导入流程**:

1. **文件选择**:
   ```html
   <input type="file" accept=".json,.zip" />
   ```

2. **解析和检查**:
   - JSON: 直接解析
   - ZIP: 解压后读取所有 .json 文件
   - 校验格式和必填字段
   - 检测名称冲突

3. **预览对话框**:
   ```
   ┌─────────────────────────────────────┐
   │ 准备导入 5 个模板                   │
   ├─────────────────────────────────────┤
   │ ✓ 新模板-1                          │
   │ ✓ 新模板-2                          │
   │ ⚠️ 模板-3 (名称冲突)                │
   │   └→ 将重命名为: 模板-3-导入1       │
   │ ✓ 新模板-4                          │
   │ ❌ 模板-5 (格式错误)                │
   │   └→ 跳过此模板                     │
   ├─────────────────────────────────────┤
   │ 冲突处理: [自动重命名▼]             │
   │           [覆盖现有]                 │
   │           [跳过冲突]                 │
   │                                      │
   │          [取消]  [导入]              │
   └─────────────────────────────────────┘
   ```

4. **执行导入**:
   - 并发创建模板（Promise.all）
   - 显示进度条（可选）
   - 收集成功/失败结果

5. **结果反馈**:
   - Toast: "成功导入 4 个模板，1 个失败"
   - 列表刷新
   - 高亮新导入的模板（3秒后恢复）

**冲突处理策略**:

| 策略 | 行为 |
|------|------|
| 自动重命名 | 添加后缀 "-导入1", "-导入2"... |
| 覆盖现有 | 直接更新同名模板 |
| 跳过冲突 | 只导入不冲突的模板 |

---

## 6. 预览模式设计

### 6.1 预览界面布局

**上下分栏**:
```
┌─────────────────────────────────────────┐
│ 选择模板: [brand-logo-modern      ▼]   │  ← 快速切换
├─────────────────────────────────────────┤
│                                          │
│      [示例图大图显示区域]                │
│        (400x300)                         │
│                                          │
├─────────────────────────────────────────┤
│ [缩略图1] [缩略图2] [缩略图3]           │  ← 示例列表
│  蓝色•大   红色•小   默认               │
├─────────────────────────────────────────┤
│ 参数配置:                                │
│ • color:  [🎨 #3b82f6]                  │
│ • size:   [━━●━━━━━] 100                │
│ • type:   [modern     ▼]                │
├─────────────────────────────────────────┤
│ 💡 提示: 调整参数仅更新提示词预览       │
├─────────────────────────────────────────┤
│ 编译后提示词:                            │
│ ┌─────────────────────────────────────┐ │
│ │ Generate a blue SVG logo in        │ │
│ │ modern style with size 100         │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│              [应用到工作台]              │
└─────────────────────────────────────────┘
```

### 6.2 静态示例展示

**示例来源**:
- 读取模板的 `examples` 字段
- 如果为空，显示占位提示："暂无示例图，在编辑模式添加"

**示例展示**:
- 大图区域：显示当前选中的示例 SVG（居中显示）
- 缩略图列表：横向滚动，80x80 尺寸
- 点击缩略图切换大图
- 每个缩略图下方显示参数说明（自动生成或手动编辑）

**参数说明自动生成**:
```typescript
function generateDescription(params: Record<string, string>): string {
  const parts = Object.entries(params)
    .map(([key, value]) => {
      if (key === 'color') return value; // 直接显示颜色值
      return `${value}`;
    })
    .filter(Boolean);
  
  return parts.join(' • '); // 例如: "#3b82f6 • 100 • modern"
}
```

### 6.3 参数实时预览

**行为**:
- 用户调整参数时，**不触发 API 生成 SVG**
- 仅实时更新下方"编译后提示词"预览框
- 提示词编译逻辑：替换 `{{key}}` 为当前值

**提示信息**:
- 显示提示图标：💡
- 文本："静态示例仅供参考，调整参数后在工作台生成实际 SVG"

### 6.4 应用到工作台

**功能**:
- 底部按钮："应用到工作台"
- 点击后执行：
  1. 关闭左侧面板（收起到窄态）
  2. 自动选择该模板
  3. 应用当前参数配置
  4. 中央面板准备就绪，用户可点击"生成"

**快捷键**:
- `Enter` - 应用到工作台
- `Esc` - 取消并返回浏览模式

### 6.5 模板选择器

**顶部下拉框**:
- 显示当前预览的模板名称
- 点击展开：下拉列表，按分类分组
- 支持搜索过滤（输入即过滤）
- 键盘导航：上下箭头选择，Enter 确认

**快捷键**:
- `Ctrl+P` - 打开模板快速选择器（类似 VS Code 命令面板）
- 输入框聚焦，输入即搜索
- 显示前 20 个匹配结果
- Enter 选择，Esc 取消

---

## 7. 代码重构架构

### 7.1 组件拆分

**新的目录结构**:
```
desktop/src/components/template/
├── TemplatePanel.tsx              # 主容器，状态管理
├── modes/
│   ├── BrowseMode.tsx            # 浏览模式
│   ├── EditMode.tsx              # 编辑模式
│   ├── ManageMode.tsx            # 管理模式
│   └── PreviewMode.tsx           # 预览模式
├── components/
│   ├── TemplateCard.tsx          # 模板卡片
│   ├── TemplateGrid.tsx          # 网格布局容器
│   ├── TemplateList.tsx          # 列表布局容器
│   ├── TemplateBatchToolbar.tsx # 批量操作工具栏
│   ├── TemplateContextMenu.tsx  # 右键菜单
│   ├── TemplateForm.tsx          # 表单（重构现有）
│   ├── OptionEditor.tsx          # 参数编辑器（现有）
│   ├── TemplateSearch.tsx        # 搜索栏
│   ├── CategorySidebar.tsx       # 分类边栏
│   ├── ExampleManager.tsx        # 示例管理器（新增）
│   └── ImportDialog.tsx          # 导入对话框（新增）
├── hooks/
│   ├── useTemplateSelection.ts   # 选择逻辑
│   ├── useTemplateBatch.ts       # 批量操作
│   ├── useTemplateImportExport.ts # 导入导出
│   ├── useKeyboardShortcuts.ts   # 快捷键
│   └── useTemplatePanel.ts       # 面板状态
└── utils/
    ├── templateUtils.ts          # 工具函数
    └── templateValidation.ts     # 验证逻辑
```

### 7.2 核心组件职责

#### TemplatePanel.tsx (主容器)

**职责**:
- 管理面板状态（展开/收起）
- 管理当前模式（浏览/编辑/管理/预览）
- 提供统一的上下文 (TemplatePanelContext)
- 渲染顶部模式切换标签
- 根据模式渲染对应的子组件

**API**:
```typescript
interface TemplatePanelProps {
  selectedTemplate: Template | null;
  templateParams: Record<string, string>;
  onSelectTemplate: (t: Template | null) => void;
  onParamsChange: (p: Record<string, string>) => void;
}

interface TemplatePanelContext {
  expanded: boolean;
  togglePanel: () => void;
  mode: 'browse' | 'edit' | 'manage' | 'preview';
  setMode: (mode: string) => void;
  templates: Template[];
  refreshTemplates: () => Promise<void>;
}
```

#### BrowseMode.tsx

**职责**:
- 显示模板网格/列表
- 搜索和筛选
- 处理模板选择
- 右键菜单

**依赖组件**:
- TemplateSearch
- CategorySidebar
- TemplateGrid / TemplateList
- TemplateContextMenu

#### EditMode.tsx

**职责**:
- 创建/编辑模板表单
- 参数配置
- 示例管理
- 实时验证

**依赖组件**:
- TemplateForm
- OptionEditor
- ExampleManager

#### ManageMode.tsx

**职责**:
- 批量选择界面
- 批量操作工具栏
- 导入功能

**依赖组件**:
- TemplateBatchToolbar
- TemplateGrid (带多选)
- ImportDialog

#### PreviewMode.tsx

**职责**:
- 示例展示
- 参数配置
- 提示词预览
- 应用到工作台

**组件结构**:
- 模板选择器
- 示例展示区
- 参数配置区
- 提示词预览区

### 7.3 自定义 Hooks

#### useTemplateSelection.ts

```typescript
export function useTemplateSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastSelected, setLastSelected] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLastSelected(id);
  };

  const selectRange = (fromId: string, toId: string, allIds: string[]) => {
    const fromIdx = allIds.indexOf(fromId);
    const toIdx = allIds.indexOf(toId);
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    
    setSelected(new Set(allIds.slice(start, end + 1)));
    setLastSelected(toId);
  };

  const selectAll = (allIds: string[]) => {
    setSelected(new Set(allIds));
  };

  const clear = () => {
    setSelected(new Set());
    setLastSelected(null);
  };

  return { 
    selected, 
    lastSelected,
    toggle, 
    selectRange, 
    selectAll, 
    clear 
  };
}
```

#### useTemplateBatch.ts

```typescript
export function useTemplateBatch() {
  const deleteMultiple = async (ids: string[]) => {
    const results = await Promise.allSettled(
      ids.map(id => api.deleteTemplate(id))
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    if (failed === 0) {
      toast.success(`已删除 ${succeeded} 个模板`);
    } else {
      toast.warning(`已删除 ${succeeded} 个，${failed} 个失败`);
    }
  };

  const exportMultiple = async (templates: Template[]) => {
    const zip = new JSZip();
    
    // 添加 manifest
    zip.file('manifest.json', JSON.stringify({
      version: '1.0',
      exported_at: new Date().toISOString(),
      count: templates.length
    }));
    
    // 添加模板文件
    templates.forEach((tmpl, idx) => {
      zip.file(`template-${idx + 1}.json`, JSON.stringify(tmpl, null, 2));
    });
    
    const blob = await zip.generateAsync({ type: 'blob' });
    const filename = `templates-export-${new Date().toISOString().slice(0, 10)}.zip`;
    saveAs(blob, filename);
    
    toast.success(`已导出 ${templates.length} 个模板`);
  };

  const updateCategory = async (ids: string[], category: string) => {
    const results = await Promise.allSettled(
      ids.map(async id => {
        const tmpl = await api.getTemplate(id);
        return api.updateTemplate(id, { ...tmpl, category });
      })
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    toast.success(`已更新 ${succeeded} 个模板的分类`);
  };

  return { deleteMultiple, exportMultiple, updateCategory };
}
```

#### useTemplateImportExport.ts

```typescript
export function useTemplateImportExport() {
  const exportToJSON = (template: Template): string => {
    return JSON.stringify(template, null, 2);
  };

  const importFromJSON = async (jsonString: string): Promise<ImportResult> => {
    try {
      const data = JSON.parse(jsonString);
      
      // 验证必填字段
      if (!data.name || !data.prompt_template) {
        throw new Error('缺少必填字段');
      }
      
      // 检查名称冲突
      const existing = await api.listTemplates();
      const conflict = existing.templates.some(t => t.name === data.name);
      
      return {
        valid: true,
        template: data,
        conflict,
        suggestedName: conflict ? `${data.name}-导入1` : data.name
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  };

  const importFromZip = async (file: File): Promise<ImportResult[]> => {
    const zip = await JSZip.loadAsync(file);
    const results: ImportResult[] = [];
    
    for (const [filename, zipEntry] of Object.entries(zip.files)) {
      if (filename.endsWith('.json') && filename !== 'manifest.json') {
        const content = await zipEntry.async('string');
        const result = await importFromJSON(content);
        results.push(result);
      }
    }
    
    return results;
  };

  return { exportToJSON, importFromJSON, importFromZip };
}
```

#### useKeyboardShortcuts.ts

```typescript
interface ShortcutHandlers {
  onNew?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onTogglePanel?: () => void;
  onQuickOpen?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N - 新建
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        handlers.onNew?.();
      }
      
      // Ctrl+E - 编辑
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        handlers.onEdit?.();
      }
      
      // Delete - 删除
      if (e.key === 'Delete') {
        e.preventDefault();
        handlers.onDelete?.();
      }
      
      // Ctrl+D - 复制
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        handlers.onCopy?.();
      }
      
      // Ctrl+B - 切换面板
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        handlers.onTogglePanel?.();
      }
      
      // Ctrl+P - 快速打开
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        handlers.onQuickOpen?.();
      }
      
      // Ctrl+S - 保存
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handlers.onSave?.();
      }
      
      // Esc - 取消
      if (e.key === 'Escape') {
        e.preventDefault();
        handlers.onCancel?.();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
```

### 7.4 状态管理扩展

**扩展 templateStore.ts**:

```typescript
interface TemplateStore extends ExistingTemplateStore {
  // 面板状态
  panelExpanded: boolean;
  activeMode: 'browse' | 'edit' | 'manage' | 'preview';
  
  // 视图状态
  viewMode: 'grid' | 'list';
  searchQuery: string;
  categoryFilter: string | null;
  sortBy: 'name-asc' | 'name-desc' | 'created' | 'updated' | 'category';
  
  // 选择状态
  selectedIds: Set<string>;
  
  // 编辑状态
  editingTemplate: Template | null;
  
  // 操作方法
  togglePanel: () => void;
  setMode: (mode: 'browse' | 'edit' | 'manage' | 'preview') => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string | null) => void;
  setSortBy: (sort: string) => void;
  
  toggleSelection: (id: string) => void;
  selectRange: (fromId: string, toId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  
  startEdit: (template: Template | null) => void;
  cancelEdit: () => void;
  
  // 过滤后的模板列表
  getFilteredTemplates: () => Template[];
}
```

**实现示例**:

```typescript
export const useTemplateStore = create<TemplateStore>()(
  immer((set, get) => ({
    // ... 现有状态
    
    panelExpanded: false,
    activeMode: 'browse',
    viewMode: 'grid',
    searchQuery: '',
    categoryFilter: null,
    sortBy: 'name-asc',
    selectedIds: new Set(),
    editingTemplate: null,
    
    togglePanel: () => set(s => { s.panelExpanded = !s.panelExpanded; }),
    
    setMode: (mode) => set(s => { 
      s.activeMode = mode;
      if (mode !== 'manage') s.selectedIds.clear();
    }),
    
    toggleSelection: (id) => set(s => {
      if (s.selectedIds.has(id)) {
        s.selectedIds.delete(id);
      } else {
        s.selectedIds.add(id);
      }
    }),
    
    getFilteredTemplates: () => {
      const { templates, searchQuery, categoryFilter, sortBy } = get();
      
      let filtered = templates;
      
      // 搜索过滤
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(t =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      }
      
      // 分类过滤
      if (categoryFilter) {
        filtered = filtered.filter(t => t.category === categoryFilter);
      }
      
      // 排序
      const sorted = [...filtered];
      switch (sortBy) {
        case 'name-asc':
          sorted.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'name-desc':
          sorted.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case 'category':
          sorted.sort((a, b) => a.category.localeCompare(b.category));
          break;
      }
      
      return sorted;
    },
  }))
);
```

---

## 8. 数据模型扩展

### 8.1 Template 类型扩展

```typescript
interface Template {
  // 现有字段
  name: string;
  description: string;
  category: string;
  reference: string | null;
  prompt_template: string;
  options: TemplateOption[];
  validation: { rules: string[]; retry_on_fail: number };
  
  // 新增字段
  examples?: TemplateExample[];  // 静态示例
  created_at?: string;           // 创建时间
  updated_at?: string;           // 更新时间
  metadata?: {                   // 元数据
    author?: string;
    version?: string;
    tags?: string[];
  };
}

interface TemplateExample {
  svg_content: string;            // SVG 代码
  params: Record<string, string>; // 参数配置
  description: string;            // 描述说明
  thumbnail?: string;             // 缩略图 (base64 或 URL)
}
```

### 8.2 API 扩展

**后端需要支持的新字段**:
- 模板列表接口返回 `created_at` 和 `updated_at`
- 创建/更新接口支持 `examples` 字段
- 支持 `metadata` 字段的保存和读取

**兼容性**:
- 新字段为可选，不影响现有模板
- 前端渐进式使用新字段

---

## 9. 技术实现细节

### 9.1 面板动画

**CSS 过渡**:
```css
.template-panel {
  width: 288px;
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.template-panel.expanded {
  width: 700px;
}
```

**注意事项**:
- 使用 `will-change: width` 优化性能
- 中央预览区域相应调整宽度
- 动画期间禁用点击事件（防止误操作）

### 9.2 虚拟滚动（可选优化）

**场景**:
- 当模板数量 > 100 时，考虑使用虚拟滚动
- 只渲染可见区域的卡片

**实现方案**:
- 使用 `react-window` 或 `react-virtual`
- 固定卡片高度（网格模式）
- 动态计算可见范围

### 9.3 右键菜单实现

**技术方案**:
```typescript
const TemplateContextMenu: React.FC<Props> = ({ x, y, template, onClose }) => {
  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);
  
  return (
    <div 
      className="context-menu"
      style={{ position: 'fixed', left: x, top: y, zIndex: 1000 }}
    >
      <button onClick={() => { handleEdit(template); onClose(); }}>
        ✏️ 编辑模板
      </button>
      {/* ... 其他菜单项 */}
    </div>
  );
};
```

**注意事项**:
- 边界检测（菜单超出屏幕时向上/向左弹出）
- 点击菜单项后自动关闭
- 点击外部区域关闭

### 9.4 导入导出技术栈

**依赖库**:
```json
{
  "jszip": "^3.10.1",
  "file-saver": "^2.0.5"
}
```

**导出流程**:
```typescript
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

async function exportTemplates(templates: Template[]) {
  const zip = new JSZip();
  
  templates.forEach((tmpl, idx) => {
    zip.file(`template-${idx + 1}.json`, JSON.stringify(tmpl, null, 2));
  });
  
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'templates-export.zip');
}
```

**导入流程**:
```typescript
import JSZip from 'jszip';

async function importTemplates(file: File): Promise<Template[]> {
  const zip = await JSZip.loadAsync(file);
  const templates: Template[] = [];
  
  for (const filename in zip.files) {
    if (filename.endsWith('.json') && filename !== 'manifest.json') {
      const content = await zip.files[filename].async('string');
      const template = JSON.parse(content);
      templates.push(template);
    }
  }
  
  return templates;
}
```

---

## 10. 实施计划概览

### 10.1 开发阶段划分

**阶段 1: 核心架构** (优先级: 高)
- TemplatePanel 主容器
- 面板状态管理
- 模式切换框架
- 状态 Store 扩展

**阶段 2: 浏览模式** (优先级: 高)
- 网格/列表视图
- 搜索和筛选
- 右键菜单
- 快捷键支持

**阶段 3: 编辑模式** (优先级: 高)
- 表单重构
- 参数配置器优化
- 实时验证
- 示例管理器

**阶段 4: 管理模式** (优先级: 中)
- 批量选择交互
- 批量删除
- 批量导出
- 批量改分类

**阶段 5: 导入功能** (优先级: 中)
- 文件选择和解析
- 冲突检测
- 导入预览对话框
- 执行导入

**阶段 6: 预览模式** (优先级: 低)
- 示例展示
- 参数配置
- 提示词预览
- 应用到工作台

**阶段 7: 优化和测试** (优先级: 低)
- 性能优化
- 边界情况处理
- 单元测试
- E2E 测试

### 10.2 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 大量模板时性能问题 | 中 | 虚拟滚动、分页加载 |
| 组件重构影响现有功能 | 高 | 渐进式重构，保持旧组件可用 |
| 导入导出格式不兼容 | 中 | 严格的格式验证和版本标识 |
| 快捷键冲突 | 低 | 提供快捷键自定义配置 |

### 10.3 测试策略

**单元测试**:
- Hooks 逻辑测试（选择、批量操作）
- 工具函数测试（验证、过滤、排序）
- 组件快照测试

**集成测试**:
- 模式切换流程
- 创建-编辑-删除完整流程
- 导入导出功能

**E2E 测试**:
- 用户典型操作路径
- 边界情况（大量模板、冲突处理）

---

## 11. 成功标准

### 11.1 功能完整性

- ✅ 四种模式全部实现并可用
- ✅ 批量操作（删除、导出、改分类）可用
- ✅ 导入导出功能正常工作
- ✅ 快捷键全部生效
- ✅ 右键菜单覆盖所有操作

### 11.2 性能指标

- 模板列表渲染 < 100ms（100 个模板）
- 面板展开/收起动画流畅（60fps）
- 搜索响应 < 300ms
- 批量操作（10 个模板）< 2s

### 11.3 用户体验

- 操作流程清晰，无需文档即可上手
- 快捷键提升效率 30%+
- 批量操作减少重复点击 80%+
- 右键菜单提供便捷访问

### 11.4 代码质量

- 组件平均行数 < 200
- 单一职责原则：每个组件只做一件事
- 代码复用率 > 80%
- 类型覆盖率 100%
- 测试覆盖率 > 70%

---

## 12. 未来扩展

### 12.1 第二版功能（预留）

- 模板标签系统
- 模板收藏夹
- 模板使用统计
- 模板版本历史
- 模板协作分享
- AI 辅助模板生成

### 12.2 技术债务清理

- 统一错误处理机制
- 提取共享 UI 组件库
- 性能监控和优化
- 无障碍性改进

---

## 13. 附录

### 13.1 快捷键列表

| 快捷键 | 功能 | 适用模式 |
|--------|------|----------|
| Ctrl+B | 展开/收起面板 | 全局 |
| Ctrl+N | 新建模板 | 浏览、编辑 |
| Ctrl+E | 编辑选中模板 | 浏览 |
| Ctrl+D | 复制选中模板 | 浏览 |
| Delete | 删除选中模板 | 浏览、管理 |
| Ctrl+S | 保存 | 编辑 |
| Ctrl+P | 快速打开模板 | 全局 |
| Ctrl+F | 搜索 | 浏览 |
| Ctrl+A | 全选 | 管理 |
| Esc | 取消/关闭 | 全局 |
| Enter | 确认/应用 | 预览 |

### 13.2 分类映射

| 分类 | 中文名称 | 图标 | 渐变色 |
|------|----------|------|--------|
| brand | 品牌标志 | 🎨 | purple-pink |
| chart | 数据图表 | 📊 | blue-cyan |
| illustration | 插画 | 🎭 | orange-red |
| icon | 图标 | ⭐ | green-teal |
| infographic | 信息图 | 📈 | indigo-purple |
| general | 通用 | 📄 | gray |

### 13.3 文件大小限制

| 项目 | 限制 | 说明 |
|------|------|------|
| 单个模板 JSON | 100KB | 包含示例时可能较大 |
| 示例 SVG | 50KB | 单个示例的大小 |
| 批量导出 ZIP | 10MB | 建议分批导出 |
| 导入 ZIP | 10MB | 超过时提示分批导入 |

---

## 14. 总结

本设计方案全面重构桌面端模板管理系统，通过引入多视图架构、精简卡片设计、批量操作和快捷键支持，大幅提升用户体验和操作效率。

核心优势：
- **专注工作区**: 每个场景都有优化的界面
- **高效操作**: 快捷键和批量操作减少重复劳动
- **灵活扩展**: 组件化架构便于后续功能添加
- **代码质量**: 重构后的代码结构清晰，易于维护

实施后预期收益：
- 模板管理效率提升 50%+
- 代码可维护性提升 80%+
- 用户满意度显著提高

---

**设计版本**: 1.0  
**最后更新**: 2026-06-16  
**状态**: 待用户审查
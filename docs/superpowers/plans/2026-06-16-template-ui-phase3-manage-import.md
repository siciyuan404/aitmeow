# Phase 3: 管理模式 + 导入导出实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现批量管理功能和完整的导入导出系统

**Architecture:** 
- ManageMode 组件支持多选和批量操作
- useTemplateBatch Hook 封装批量操作逻辑
- useTemplateImportExport Hook 处理导入导出
- 使用 JSZip 和 FileSaver 库

**Tech Stack:** React, TypeScript, Zustand, JSZip, FileSaver

**依赖**: Phase 1 的核心架构和选择逻辑

---

## 前置准备

### Task 0: 安装依赖库

**关键步骤**:
- [ ] 安装 jszip 和 file-saver

```bash
cd desktop
npm install jszip file-saver
npm install --save-dev @types/file-saver
```

- [ ] 验证安装

```bash
npm list jszip file-saver
```

- [ ] Commit package.json 和 package-lock.json

---

## 任务概要

### Task 1: 创建 TemplateBatchToolbar 组件
**目标**: 批量操作工具栏

**关键步骤**:
- [ ] 选择状态栏（已选 N 项）
- [ ] 快速操作按钮（全选、反选、清除）
- [ ] 批量操作按钮（删除、导出、改分类）
- [ ] 灰色显示未实现功能（预留扩展）
- [ ] 样式和交互
- [ ] Commit

**Files**:
- Create: `desktop/src/components/template/components/TemplateBatchToolbar.tsx`

---

### Task 2: 创建 useTemplateBatch Hook
**目标**: 封装批量操作逻辑

**关键步骤**:
- [ ] 实现 deleteMultiple 方法
- [ ] 实现 exportMultiple 方法（生成 ZIP）
- [ ] 实现 updateCategory 方法
- [ ] 错误处理和进度反馈
- [ ] Toast 通知
- [ ] Commit

**Files**:
- Create: `desktop/src/components/template/hooks/useTemplateBatch.ts`

**核心实现**:
```typescript
export function useTemplateBatch() {
  const deleteMultiple = async (ids: string[]) => {
    const results = await Promise.allSettled(
      ids.map(id => api.deleteTemplate(id))
    );
    // 统计成功/失败
    // 显示 Toast
  };

  const exportMultiple = async (templates: Template[]) => {
    const zip = new JSZip();
    // 添加 manifest.json
    // 添加每个模板的 JSON 文件
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `templates-export-${Date.now()}.zip`);
  };

  const updateCategory = async (ids: string[], category: string) => {
    // 批量更新分类
  };

  return { deleteMultiple, exportMultiple, updateCategory };
}
```

---

### Task 3: 创建 useTemplateImportExport Hook
**目标**: 处理导入导出逻辑

**关键步骤**:
- [ ] 实现 exportToJSON 方法（单个模板）
- [ ] 实现 importFromJSON 方法（解析和验证）
- [ ] 实现 importFromZip 方法（批量导入）
- [ ] 名称冲突检测
- [ ] 格式验证
- [ ] Commit

**Files**:
- Create: `desktop/src/components/template/hooks/useTemplateImportExport.ts`

**核心实现**:
```typescript
export function useTemplateImportExport() {
  const importFromJSON = async (jsonString: string): Promise<ImportResult> => {
    const data = JSON.parse(jsonString);
    // 验证必填字段
    // 检查名称冲突
    return {
      valid: true,
      template: data,
      conflict: boolean,
      suggestedName: string
    };
  };

  const importFromZip = async (file: File): Promise<ImportResult[]> => {
    const zip = await JSZip.loadAsync(file);
    // 遍历所有 .json 文件
    // 解析并验证
    return results;
  };

  return { exportToJSON, importFromJSON, importFromZip };
}
```

---

### Task 4: 创建 ImportDialog 组件
**目标**: 导入预览和确认对话框

**关键步骤**:
- [ ] 文件选择界面
- [ ] 解析和检查进度
- [ ] 预览待导入模板列表
- [ ] 显示冲突和错误
- [ ] 冲突处理策略选择器（重命名/覆盖/跳过）
- [ ] 执行导入
- [ ] 结果反馈
- [ ] Commit

**Files**:
- Create: `desktop/src/components/template/components/ImportDialog.tsx`

**UI 结构**:
```
┌─────────────────────────────────────┐
│ 导入模板                             │
├─────────────────────────────────────┤
│ [选择文件...]  template-export.zip  │
├─────────────────────────────────────┤
│ 准备导入 5 个模板:                  │
│ ✓ 新模板-1                          │
│ ✓ 新模板-2                          │
│ ⚠️ 模板-3 (冲突) → 模板-3-导入1     │
│ ✓ 新模板-4                          │
│ ❌ 模板-5 (格式错误)                │
├─────────────────────────────────────┤
│ 冲突处理: [自动重命名 ▼]            │
│                                      │
│         [取消]  [导入]               │
└─────────────────────────────────────┘
```

---

### Task 5: 扩展导入导出类型定义
**目标**: 定义导入导出相关类型

**关键步骤**:
- [ ] 添加 ImportResult 接口
- [ ] 添加 ExportManifest 接口
- [ ] 添加 ConflictStrategy 类型
- [ ] Commit

**Files**:
- Modify: `desktop/src/types/template.ts`

```typescript
export interface ImportResult {
  valid: boolean;
  template?: TemplateDefinition;
  conflict?: boolean;
  suggestedName?: string;
  error?: string;
}

export interface ExportManifest {
  version: string;
  exported_at: string;
  count: number;
}

export type ConflictStrategy = 'rename' | 'overwrite' | 'skip';
```

---

### Task 6: 创建 ManageMode 主组件
**目标**: 管理模式容器

**关键步骤**:
- [ ] 创建 ManageMode 组件
- [ ] 集成 TemplateBatchToolbar
- [ ] 集成 TemplateGrid（多选模式）
- [ ] 处理批量选择交互（Ctrl+点击、Shift+范围选择）
- [ ] 绑定批量操作
- [ ] 添加导入按钮
- [ ] Commit

**Files**:
- Create: `desktop/src/components/template/modes/ManageMode.tsx`

---

### Task 7: 实现批量删除功能
**目标**: 完整的批量删除流程

**关键步骤**:
- [ ] 点击删除按钮触发
- [ ] 显示确认对话框（列出待删除项）
- [ ] 并发执行删除
- [ ] 显示进度（可选）
- [ ] 成功/失败统计
- [ ] 刷新列表
- [ ] 清除选择
- [ ] Commit

---

### Task 8: 实现批量导出功能
**目标**: 导出选中模板为 ZIP

**关键步骤**:
- [ ] 点击导出按钮触发
- [ ] 使用 JSZip 打包
- [ ] 生成 manifest.json
- [ ] 每个模板一个 JSON 文件
- [ ] 触发下载
- [ ] Toast 通知
- [ ] Commit

---

### Task 9: 实现批量改分类功能
**目标**: 批量更新模板分类

**关键步骤**:
- [ ] 点击改分类按钮
- [ ] 显示分类选择对话框
- [ ] 支持选择现有分类或创建新分类
- [ ] 并发更新所有选中模板
- [ ] 刷新列表
- [ ] Toast 通知
- [ ] Commit

---

### Task 10: 实现导入功能
**目标**: 完整的导入流程

**关键步骤**:
- [ ] 点击导入按钮打开文件选择器
- [ ] 支持 .json 和 .zip 文件
- [ ] 解析文件
- [ ] 显示 ImportDialog
- [ ] 处理冲突策略
- [ ] 执行导入
- [ ] 显示结果
- [ ] 刷新列表并高亮新导入的模板
- [ ] Commit

---

### Task 11: 右键菜单扩展
**目标**: 添加导出选项到右键菜单

**关键步骤**:
- [ ] 在 TemplateContextMenu 添加"导出 JSON"选项
- [ ] 实现单个模板导出
- [ ] 触发下载
- [ ] Commit

**Files**:
- Modify: `desktop/src/components/template/components/TemplateContextMenu.tsx`

---

### Task 12: 集成到 TemplatePanel
**目标**: 将管理模式加入面板

**关键步骤**:
- [ ] 在 TemplatePanel 导入 ManageMode
- [ ] 添加管理模式路由
- [ ] 测试模式切换
- [ ] Commit

**Files**:
- Modify: `desktop/src/components/template/TemplatePanel.tsx`

---

### Task 13: 键盘快捷键支持
**目标**: 添加管理模式的快捷键

**关键步骤**:
- [ ] Ctrl+A - 全选
- [ ] Delete - 删除选中项
- [ ] Esc - 清除选择
- [ ] 在 useKeyboardShortcuts 中实现
- [ ] Commit

**Files**:
- Modify: `desktop/src/components/template/hooks/useKeyboardShortcuts.ts`

---

### Task 14: 边界情况处理
**目标**: 处理各种边界情况

**关键步骤**:
- [ ] 空选择时禁用批量操作按钮
- [ ] 网络错误处理
- [ ] 大文件导入性能优化
- [ ] 导入过程中的加载状态
- [ ] Commit

---

### Task 15: 端到端测试
**目标**: 测试完整的管理流程

**关键步骤**:
- [ ] 测试多选交互（点击、Ctrl+点击、Shift+范围选择）
- [ ] 测试批量删除（成功、部分失败）
- [ ] 测试批量导出（单个、多个、大量）
- [ ] 测试批量改分类
- [ ] 测试导入 JSON（单个、冲突）
- [ ] 测试导入 ZIP（多个、冲突、格式错误）
- [ ] 测试所有快捷键
- [ ] 修复发现的问题
- [ ] Commit

---

### Task 16: 性能优化（可选）
**目标**: 优化大量模板的性能

**关键步骤**:
- [ ] 批量操作添加进度条
- [ ] 导入大文件时分批处理
- [ ] 防抖搜索输入
- [ ] Commit

---

### Task 17: 文档和提交
**目标**: 记录管理功能

**关键步骤**:
- [ ] 更新组件文档
- [ ] 记录导入导出格式
- [ ] 使用示例
- [ ] 最终 commit

---

## 依赖关系

```
Task 0 (安装依赖) ──→ Task 2,3 (Hooks)

Task 1 (工具栏) ─┐
Task 2 (批量Hook) ├─→ Task 6 (ManageMode)
Task 3 (导入导出)─┘

Task 4 (ImportDialog) ──→ Task 10 (导入功能)

Task 5 (类型) ──→ Task 3,4

Task 6 ──→ Task 7-10 (各功能实现)

Task 11 (右键菜单) ──→ Task 15 (测试)

Task 12 (集成) ──→ Task 15 (测试)
```

**可并行执行**:
- Task 1 (工具栏)
- Task 2 (批量 Hook)
- Task 3 (导入导出 Hook)
- Task 4 (ImportDialog)
- Task 5 (类型定义)

---

## 预估时间

- Task 0-5: 1-1.5 天
- Task 6-13: 1.5-2 天
- Task 14-17: 0.5-1 天
- **总计**: 3-4.5 天

---

## 成功标准

- ✅ 可以多选模板（点击、Ctrl、Shift）
- ✅ 批量删除功能正常工作
- ✅ 批量导出生成正确的 ZIP 文件
- ✅ 批量改分类更新所有选中项
- ✅ 导入 JSON 单个模板成功
- ✅ 导入 ZIP 批量模板成功
- ✅ 冲突检测和处理策略正常工作
- ✅ 所有快捷键生效

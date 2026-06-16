# Phase 2: 编辑模式实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现完整的模板创建和编辑功能

**Architecture:** 
- 重构现有 TemplateForm 和 OptionEditor
- 新增 ExampleManager 支持静态示例管理
- 实现实时验证和表单状态管理
- EditMode 组件整合所有编辑功能

**Tech Stack:** React, TypeScript, Zustand, Tailwind CSS

**依赖**: Phase 1 的核心架构（TemplatePanel, templateStore 扩展）

---

## 任务概要

### Task 1: 重构 TemplateForm 组件
**目标**: 优化表单布局，支持左右分栏，实时预览

**关键步骤**:
- [ ] 改为左右分栏布局（表单 400px + 预览 300px）
- [ ] 添加编译后提示词实时预览
- [ ] 实现参数变量自动检测和高亮
- [ ] 添加表单验证逻辑
- [ ] Commit

**Files**:
- Modify: `desktop/src/components/template/TemplateForm.tsx`

---

### Task 2: 优化 OptionEditor 组件
**目标**: 支持拖拽排序和内联编辑

**关键步骤**:
- [ ] 添加拖拽手柄和排序功能
- [ ] 实现展开/折叠详细编辑
- [ ] 优化各参数类型的配置界面
- [ ] 添加参数删除确认
- [ ] Commit

**Files**:
- Modify: `desktop/src/components/template/OptionEditor.tsx`

---

### Task 3: 创建 ParameterList 组件
**目标**: 参数列表容器，支持拖拽和批量操作

**关键步骤**:
- [ ] 创建参数列表组件
- [ ] 实现拖拽排序（使用 @dnd-kit 或原生）
- [ ] 添加"添加参数"表单
- [ ] 参数类型选择器
- [ ] Commit

**Files**:
- Create: `desktop/src/components/template/components/ParameterList.tsx`

---

### Task 4: 创建 ExampleManager 组件
**目标**: 管理模板静态示例

**关键步骤**:
- [ ] 示例列表显示（缩略图 + 描述）
- [ ] 添加示例对话框（粘贴 SVG 或从历史选择）
- [ ] 删除示例功能
- [ ] 生成缩略图预览
- [ ] Commit

**Files**:
- Create: `desktop/src/components/template/components/ExampleManager.tsx`

---

### Task 5: 创建示例数据类型和工具
**目标**: 支持示例的存储和处理

**关键步骤**:
- [ ] 扩展 Template 类型添加 `examples` 字段
- [ ] 创建 TemplateExample 接口
- [ ] 添加示例验证函数
- [ ] 添加缩略图生成函数
- [ ] Commit

**Files**:
- Modify: `desktop/src/types/template.ts`
- Create: `desktop/src/components/template/utils/exampleUtils.ts`

---

### Task 6: 实现实时验证逻辑
**目标**: 表单提交前的验证检查

**关键步骤**:
- [ ] 创建验证函数（名称唯一性、必填字段）
- [ ] 检测未定义的模板变量
- [ ] 实时显示验证错误
- [ ] 阻止无效表单保存
- [ ] Commit

**Files**:
- Create: `desktop/src/components/template/utils/templateValidation.ts`

---

### Task 7: 创建 EditMode 主组件
**目标**: 编辑模式的容器组件

**关键步骤**:
- [ ] 创建 EditMode 容器
- [ ] 集成 TemplateForm
- [ ] 集成 ExampleManager
- [ ] 添加顶部操作栏（返回、保存、取消）
- [ ] 处理保存和取消逻辑
- [ ] 实现快捷键（Ctrl+S, Esc）
- [ ] Commit

**Files**:
- Create: `desktop/src/components/template/modes/EditMode.tsx`

---

### Task 8: 扩展 templateStore 编辑状态
**目标**: 添加编辑模式需要的状态管理

**关键步骤**:
- [ ] 添加 `editingTemplate` 状态
- [ ] 添加 `startEdit` 方法
- [ ] 添加 `cancelEdit` 方法
- [ ] 添加 `saveTemplate` 方法
- [ ] Commit

**Files**:
- Modify: `desktop/src/stores/templateStore.ts`

---

### Task 9: 集成到 TemplatePanel
**目标**: 将编辑模式加入面板切换

**关键步骤**:
- [ ] 在 TemplatePanel 中导入 EditMode
- [ ] 添加编辑模式的路由逻辑
- [ ] 处理从浏览模式切换到编辑模式
- [ ] 测试模式切换流程
- [ ] Commit

**Files**:
- Modify: `desktop/src/components/template/TemplatePanel.tsx`

---

### Task 10: 更新 API 服务
**目标**: 确保前端 API 支持示例字段

**关键步骤**:
- [ ] 更新 createTemplate API 调用支持 examples
- [ ] 更新 updateTemplate API 调用支持 examples
- [ ] 添加类型定义
- [ ] Commit

**Files**:
- Modify: `desktop/src/services/api.ts`

---

### Task 11: 端到端测试
**目标**: 测试完整的创建和编辑流程

**关键步骤**:
- [ ] 测试创建新模板
- [ ] 测试编辑现有模板
- [ ] 测试参数配置
- [ ] 测试示例管理
- [ ] 测试验证逻辑
- [ ] 修复发现的问题
- [ ] Commit

---

### Task 12: 文档和提交
**目标**: 记录编辑模式的使用方式

**关键步骤**:
- [ ] 更新组件文档
- [ ] 记录快捷键
- [ ] 截图和示例
- [ ] 最终 commit

---

## 依赖关系

```
Task 1-2 (表单重构) ─┐
                     ├─→ Task 7 (EditMode)
Task 3-4 (参数和示例) ┘
                     
Task 5 (类型扩展) ───→ Task 10 (API)

Task 6 (验证) ───────→ Task 7 (EditMode)

Task 8 (Store) ──────→ Task 9 (集成)

Task 7,9 ───────────→ Task 11 (测试)
```

**可并行执行**:
- Task 1-2 (表单重构)
- Task 3-4 (参数和示例)
- Task 5-6 (类型和验证)
- Task 8 (Store 扩展)

---

## 预估时间

- Task 1-6: 1.5-2 天
- Task 7-9: 0.5-1 天
- Task 10-12: 0.5-1 天
- **总计**: 2.5-4 天

---

## 成功标准

- ✅ 可以创建新模板并保存
- ✅ 可以编辑现有模板
- ✅ 参数配置器支持拖拽排序
- ✅ 示例管理器可以添加/删除示例
- ✅ 实时验证阻止无效提交
- ✅ 编译后提示词实时预览正确

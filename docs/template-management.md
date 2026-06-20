# 模板管理功能

## 概述

模板管理功能允许用户通过 UI 和 API 创建、编辑和删除 SVG 生成模板。

## API 端点

### 创建模板
```
POST /api/template
Content-Type: application/json

{
  "name": "my-template",
  "description": "My custom template",
  "category": "general",
  "prompt_template": "Generate {{type}} SVG with {{color}}",
  "options": [...]
}
```

### 更新模板
```
PUT /api/template/{name}
Content-Type: application/json

{
  "name": "my-template",
  "description": "Updated description",
  ...
}
```

### 删除模板
```
DELETE /api/template/{name}
```

## UI 操作

1. 点击左侧面板"创建"按钮
2. 填写模板信息和参数
3. 点击"保存"

## 验证规则

- 模板名称：非空，最多 64 字符，仅字母数字和特殊字符
- 提示模板：非空
- 参数 Key：唯一，不重复

## 文件持久化

所有模板保存为 TOML 文件到配置的模板目录（默认 `~/.aitmeow/templates/`）。

## 验收测试清单

在开发环境中验证以下场景：

- [ ] 创建新模板 - UI 显示正确
- [ ] 编辑现有模板 - 修改生效
- [ ] 删除模板 - 从列表移除且文件删除
- [ ] 验证失败 - 空名称触发错误提示
- [ ] 重复名称 - 创建失败并提示
- [ ] 刷新页面 - 模板持久化加载正确

# MCP 精简重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 将 MCP 模块从 12 个工具臃肿模块精简为仅包含 `svg_preview` 一个工具的轻量模块。工作流：MCP 读取桌面端会话状态（模板、参数、编译提示词）→ AI 根据提示词生成 SVG → svg_preview 将 SVG 推送至桌面端，桌面端负责校验和渲染。

**架构：** 删除 11 个多余工具及其手柄函数，只保留 `svg_preview`。精简后的模块结构：`error.rs`（错误类型）、`tool_def.rs`（仅 svg_preview 的工具定义）、`mod.rs`（MCP 协议路由 + 唯一手柄 handle_preview）。去除 handlers/ 子目录（单一工具不需要）。

**技术栈：** Rust、serde_json、axum、tokio、aitmeow-core

---

### 任务 1：删除多余的工具定义和手柄代码

**文件：**
- 修改：`crates/aitmeow-server/src/mcp.rs`

- [ ] **步骤 1：精简 list_tools()，只保留 svg_preview**

```rust
// 替换 crates/aitmeow-server/src/mcp.rs 中的 list_tools 方法
// 从原来 12 个工具精简为 1 个

fn list_tools() -> Value {
    json!({
        "tools": [
            {
                "name": "svg_preview",
                "description": "接收 AI 生成的 SVG 内容并将其推送到桌面端实时预览。\n\n当前会话上下文：\n- selected_template: 用户选中的模板名（如无则为空）\n- compiled_prompt: 用户通过模板+参数编译后的生成指令，AI 必须以此为依据生成 SVG\n- template_params: 模板参数键值对\n- reference_svg: 用户从仓库中选择的参考 SVG（如有则参考其风格）\n\n使用流程：\n1. 调用此工具前先通过工具描述了解当前会话上下文\n2. 根据 compiled_prompt 和 reference_svg 生成符合用户需求的 SVG\n3. 调用此工具提交生成的 SVG 内容\n4. 桌面端会自动校验、渲染并展示结果",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "svg_content": {
                            "type": "string",
                            "description": "根据 compiled_prompt 生成的 SVG 内容"
                        },
                        "template_name": {
                            "type": "string",
                            "description": "使用的模板名称（从会话上下文中获取）"
                        },
                        "params": {
                            "type": "object",
                            "description": "使用的模板参数（从会话上下文中获取）",
                            "additionalProperties": { "type": "string" }
                        }
                    },
                    "required": ["svg_content"]
                }
            }
        ]
    })
}
```

- [ ] **步骤 2：删除 dispatch 中多余的工具路由**

```rust
// 将 dispatch 方法精简为仅处理 svg_preview

async fn dispatch(state: &AppState, name: &str, params: &Value) -> Result<Value, String> {
    match name {
        "svg_preview" => Self::handle_preview(state, params).await,
        _ => Err(format!("unknown method: {}", name)),
    }
}
```

- [ ] **步骤 3：删除所有不再需要的手柄函数**

删除以下方法及其实现：
- `handle_validate`
- `handle_render`
- `handle_save`
- `handle_list`
- `handle_search`
- `handle_delete`
- `handle_template_list`
- `handle_template_get`
- `handle_health`
- `handle_session_state`
- `handle_publish_generation`

保留：
- `handle_request`
- `call_tool`
- `dispatch`（精简版）
- `handle_preview`（保留但简化）
- `handle_initialize`
- `list_tools`（精简版）
- `parse_rules`（如果没有任何地方引用则删除）

- [ ] **步骤 4：精简 handle_preview——去掉渲染逻辑**

```rust
// 重写 handle_preview：不再渲染 PNG，只推送 SVG 到桌面端

async fn handle_preview(state: &AppState, params: &Value) -> Result<Value, String> {
    let svg_content = params.get("svg_content").and_then(|v| v.as_str())
        .ok_or("missing 'svg_content' param")?;

    let template_name = params.get("template_name").and_then(|v| v.as_str()).unwrap_or("quick-preview");

    let params_map: HashMap<String, String> = params.get("params")
        .and_then(|v| v.as_object())
        .map(|obj| obj.iter().map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string())).collect())
        .unwrap_or_default();

    let result = session::publish_generation_internal(state, template_name, &params_map, svg_content).await;

    Ok(json!({
        "generation_id": result.id,
        "status": "accepted"
    }))
}
```

- [ ] **步骤 5：简化 handle_initialize 和 call_tool（去掉不再需要的导入）**

```rust
// 更新文件顶部的 use 声明，去掉不再使用的导入
// 特别是去掉 base64、aitmeow_core::svg、RenderOptions 等
```

- [ ] **步骤 6：检查 parse_rules 是否仍有引用**

如果 `parse_rules` 不再被任何 MCP 代码使用（桌面端 REST API 可能另有调用路径），将其删除。如果仍被 `crate::api::svg` 等模块引用，保留但移到合适位置。

- [ ] **步骤 7：编译验证**

运行：`cargo check --package aitmeow-server`
预期：编译成功。

- [ ] **步骤 8：运行已有测试**

运行：`cargo test --package aitmeow-server -- --nocapture`
预期：通过（之前添加的特征化测试中，只有 initialize 和 tools/list 的测试仍然相关，其他涉及已删除工具的测试需要更新）。

- [ ] **步骤 9：更新测试文件删除不再相关的测试**

```rust
// 在 crates/aitmeow-server/tests/mcp_test.rs 中
// 保留：test_mcp_initialize
// 保留：test_mcp_tools_list（期望工具数量从 >=12 变为 ==1）
// 删除或注释掉其他测试

#[tokio::test]
async fn test_mcp_tools_list() {
    let state = build_test_state().await;
    let result = McpRouter::handle_request(&state, "tools/list", &json!(null)).await;
    assert!(result.is_ok());
    let val = result.unwrap();
    let tools = val["tools"].as_array().unwrap();
    assert_eq!(tools.len(), 1, "expected exactly 1 tool, got {}", tools.len());
    assert_eq!(tools[0]["name"], "svg_preview");
}
```

- [ ] **步骤 10：最终编译+测试验证**

运行：`cargo test --package aitmeow-server -- --nocapture`
预期：全部 PASS。

- [ ] **步骤 11：提交**

```bash
git add crates/aitmeow-server/src/mcp.rs crates/aitmeow-server/tests/mcp_test.rs
git commit -m "refactor(mcp): strip to single svg_preview tool, remove all other MCP tools"
```

---

### 任务 2：提取 McpError 错误类型（轻量版）

**文件：**
- 创建：`crates/aitmeow-server/src/mcp/`
- 创建：`crates/aitmeow-server/src/mcp/error.rs`
- 创建：`crates/aitmeow-server/src/mcp/mod.rs`
- 删除：`crates/aitmeow-server/src/mcp.rs`

- [ ] **步骤 1：创建 mcp/error.rs**

```rust
// crates/aitmeow-server/src/mcp/error.rs
use serde_json::Value;

#[derive(Debug, Clone)]
pub enum McpError {
    InvalidParams(String),
    MethodNotFound(String),
    InternalError(String),
    ToolError(String),
}

impl McpError {
    pub fn code(&self) -> i32 {
        match self {
            McpError::InvalidParams(_) => -32602,
            McpError::MethodNotFound(_) => -32601,
            McpError::InternalError(_) => -32603,
            McpError::ToolError(_) => -32000,
        }
    }

    pub fn message(&self) -> &str {
        match self {
            McpError::InvalidParams(m) => m,
            McpError::MethodNotFound(m) => m,
            McpError::InternalError(m) => m,
            McpError::ToolError(m) => m,
        }
    }

    pub fn to_json_rpc_error(&self) -> Value {
        serde_json::json!({
            "code": self.code(),
            "message": self.message(),
        })
    }
}

impl std::fmt::Display for McpError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message())
    }
}

pub type McpResult<T> = std::result::Result<T, McpError>;
```

- [ ] **步骤 2：编写 McpError 单元测试**

```rust
// 追加到 crates/aitmeow-server/src/mcp/error.rs

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_codes() {
        assert_eq!(McpError::InvalidParams("x".into()).code(), -32602);
        assert_eq!(McpError::MethodNotFound("x".into()).code(), -32601);
        assert_eq!(McpError::InternalError("x".into()).code(), -32603);
        assert_eq!(McpError::ToolError("x".into()).code(), -32000);
    }

    #[test]
    fn test_json_rpc_format() {
        let e = McpError::InvalidParams("bad input".into());
        let json = e.to_json_rpc_error();
        assert_eq!(json["code"], -32602);
        assert_eq!(json["message"], "bad input");
    }
}
```

- [ ] **步骤 3：创建 mcp/tool_def.rs（仅 svg_preview）**

```rust
// crates/aitmeow-server/src/mcp/tool_def.rs
use serde_json::{json, Value};

pub struct ToolDefinition {
    pub name: &'static str,
    pub description: &'static str,
    pub input_schema: Value,
}

impl ToolDefinition {
    pub fn to_json(&self) -> Value {
        json!({
            "name": self.name,
            "description": self.description,
            "inputSchema": self.input_schema,
        })
    }
}

const SVG_PREVIEW: ToolDefinition = ToolDefinition {
    name: "svg_preview",
    description: "接收 AI 生成的 SVG 内容并将其推送到桌面端实时预览。\n\n当前会话上下文：\n- selected_template: 用户选中的模板名（如无则为空）\n- compiled_prompt: 用户通过模板+参数编译后的生成指令，AI 必须以此为依据生成 SVG\n- template_params: 模板参数键值对\n- reference_svg: 用户从仓库中选择的参考 SVG（如有则参考其风格）\n\n使用流程：\n1. 调用此工具前先通过工具描述了解当前会话上下文\n2. 根据 compiled_prompt 和 reference_svg 生成符合用户需求的 SVG\n3. 调用此工具提交生成的 SVG 内容\n4. 桌面端会自动校验、渲染并展示结果",
    input_schema: json!({
        "type": "object",
        "properties": {
            "svg_content": {
                "type": "string",
                "description": "根据 compiled_prompt 生成的 SVG 内容"
            },
            "template_name": {
                "type": "string",
                "description": "使用的模板名称（从会话上下文中获取）"
            },
            "params": {
                "type": "object",
                "description": "使用的模板参数（从会话上下文中获取）",
                "additionalProperties": { "type": "string" }
            }
        },
        "required": ["svg_content"]
    }),
};

pub fn list_tools() -> Value {
    json!({ "tools": [SVG_PREVIEW.to_json()] })
}
```

- [ ] **步骤 4：创建 mcp/mod.rs——精简版 McpRouter**

```rust
// crates/aitmeow-server/src/mcp/mod.rs
pub mod error;
pub mod tool_def;

use crate::api::session;
use crate::app_state::AppState;
use error::{McpError, McpResult};
use serde_json::{json, Value};
use std::collections::HashMap;

pub struct McpRouter;

impl McpRouter {
    pub async fn handle_request(state: &AppState, method: &str, params: &Value) -> McpResult<Value> {
        match method {
            "initialize" => Ok(Self::handle_initialize()),
            "notifications/initialized" => Ok(Value::Null),
            "tools/list" => Ok(tool_def::list_tools()),
            "tools/call" => {
                let name = params.get("name").and_then(|v| v.as_str())
                    .ok_or_else(|| McpError::InvalidParams("missing 'name' param for tools/call".into()))?;
                let args = params.get("arguments").cloned().unwrap_or(Value::Null);
                Self::call_tool(state, name, &args).await
            }
            _ => Self::dispatch(state, method, params).await,
        }
    }

    fn handle_initialize() -> Value {
        json!({
            "protocolVersion": "2024-11-05",
            "serverInfo": {
                "name": "aitmeow",
                "version": env!("CARGO_PKG_VERSION")
            },
            "capabilities": { "tools": {} }
        })
    }

    async fn call_tool(state: &AppState, name: &str, args: &Value) -> McpResult<Value> {
        let result = Self::dispatch(state, name, args).await?;
        let text = serde_json::to_string_pretty(&result)
            .map_err(|e| McpError::InternalError(format!("serialization error: {}", e)))?;
        Ok(json!({ "content": [{ "type": "text", "text": text }] }))
    }

    async fn dispatch(state: &AppState, name: &str, params: &Value) -> McpResult<Value> {
        match name {
            "svg_preview" => Self::handle_preview(state, params).await,
            _ => Err(McpError::MethodNotFound(format!("unknown method: {}", name))),
        }
    }

    async fn handle_preview(state: &AppState, params: &Value) -> McpResult<Value> {
        let svg_content = params.get("svg_content").and_then(|v| v.as_str())
            .ok_or_else(|| McpError::InvalidParams("missing 'svg_content' param".into()))?;

        let template_name = params.get("template_name").and_then(|v| v.as_str()).unwrap_or("quick-preview");

        let params_map: HashMap<String, String> = params.get("params")
            .and_then(|v| v.as_object())
            .map(|obj| obj.iter().map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string())).collect())
            .unwrap_or_default();

        let result = session::publish_generation_internal(state, template_name, &params_map, svg_content).await;

        Ok(json!({
            "generation_id": result.id,
            "status": "accepted"
        }))
    }
}
```

- [ ] **步骤 5：删除旧 mcp.rs，更新 http.rs 使用 McpError**

```bash
git rm crates/aitmeow-server/src/mcp.rs
```

```rust
// 更新 crates/aitmeow-server/src/http.rs 中的 handle_mcp

async fn handle_mcp(
    axum::extract::State(state): axum::extract::State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let method = body.get("method").and_then(|v| v.as_str()).unwrap_or("");
    let params = body.get("params").cloned().unwrap_or(serde_json::Value::Null);
    let id = body.get("id").cloned().unwrap_or(serde_json::Value::Null);

    match McpRouter::handle_request(&state, method, &params).await {
        Ok(result) => Json(serde_json::json!({
            "jsonrpc": "2.0", "id": id, "result": result
        })),
        Err(err) => Json(serde_json::json!({
            "jsonrpc": "2.0", "id": id, "error": err.to_json_rpc_error()
        })),
    }
}
```

- [ ] **步骤 6：编译验证**

运行：`cargo check --package aitmeow-server`
预期：编译成功。

- [ ] **步骤 7：运行测试**

运行：`cargo test --package aitmeow-server -- --nocapture`
预期：全部 PASS。

- [ ] **步骤 8：提交**

```bash
git add crates/aitmeow-server/src/mcp/ crates/aitmeow-server/src/http.rs
git commit -m "refactor(mcp): split into mcp/ module with McpError, single-tool list, stripped preview handler"
```

---

### 任务 3：更新桌面端 MCP 配置说明

**文件：**
- 修改：`desktop/src/components/panels/SettingsDrawer.tsx`（如有 MCP 相关描述）
- 修改：`.claude/settings.json`（可选——更新工具描述）
- 修改：`.opencode/opencode.json`（可选——更新工具描述）

- [ ] **步骤 1：更新 MCP 配置描述，反映精简后的功能**

```json
// .claude/settings.json
{
  "mcpServers": {
    "aitmeow": {
      "url": "http://127.0.0.1:8765/mcp",
      "description": "aitmeow SVG 设计工具 — 仅提供 svg_preview 工具：获取当前会话的模板提示词，提交 AI 生成的 SVG 到桌面端预览"
    }
  }
}
```

```json
// .opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "aitmeow": {
      "type": "remote",
      "url": "http://localhost:8765/mcp",
      "enabled": true,
      "description": "aitmeow SVG 工具服务 — svg_preview：获取模板提示词，提交 AI 生成的 SVG"
    }
  }
}
```

- [ ] **步骤 2：提交**

```bash
git add .claude/settings.json .opencode/opencode.json
git commit -m "docs(mcp): update MCP config descriptions to reflect single svg_preview tool"
```

---

### 任务 4：清理——删除无关的文档和计划引用

**文件：**
- 修改：`docs/architecture.md`（更新 MCP 交互图）
- 修改：`docs/template-ui-refactor.md`（如有 MCP 相关段落）

- [ ] **步骤 1：检查并更新文档**

审查 `docs/architecture.md` 中描述 `session_state`、`svg_validate`、`svg_render` 等的 Mermaid 图，精简为仅反映 svg_preview 流程。

- [ ] **步骤 2：提交**

```bash
git add docs/
git commit -m "docs: update architecture docs to reflect simplified MCP svg_preview-only design"
```

---

## 重构后的文件结构

```
crates/aitmeow-server/src/
├── mcp/                          # 精简后的 MCP 模块
│   ├── mod.rs                    # McpRouter + handle_preview（约 80 行）
│   ├── error.rs                  # McpError 枚举（约 60 行）
│   └── tool_def.rs               # 仅 svg_preview 的工具定义（约 40 行）
├── mcp.rs                        # 已删除
├── http.rs                       # 已修改——使用 McpError
└── lib.rs                        # 未修改
```

## 精简前后对比

| 项目 | 重构前 | 重构后 |
|------|--------|--------|
| MCP 工具数量 | 12 个 | 1 个（svg_preview） |
| mcp.rs 行数 | 379 行 | ~180 行（分散在 3 个文件） |
| 渲染逻辑 | MCP 内联渲染 PNG | 桌面端负责 |
| 校验逻辑 | MCP 内联校验 | 桌面端负责 |
| 仓库 CRUD | 6 个工具 | 无（桌面端通过 REST API 管理） |
| 模板查询 | 2 个工具 | 无（桌面端提供上下文） |

## svg_preview 工作流

```
1. 用户在桌面端选择模板、设置参数
2. 桌面端 POST /api/session/state 更新会话状态
3. AI Agent 调用 svg_preview（通过工具描述了解 compiled_prompt）
4. Agent 根据 compiled_prompt 生成 SVG
5. Agent 调用 svg_preview 提交 svg_content
6. 服务端通过 WebSocket 推送 GenerationReady 事件
7. 桌面端收到事件，校验并渲染 SVG，展示给用户
```

## 自我检查

**1. 规范覆盖：**
- ✅ 删除 11 个多余工具（任务 1）
- ✅ svg_preview 不渲染不校验，仅推送（任务 1 步骤 4）
- ✅ McpError 错误类型提取（任务 2）
- ✅ 精简的模块结构（任务 2）
- ✅ 测试更新（任务 1 步骤 9）
- ✅ 配置和文档更新（任务 3、4）

**2. 占位符扫描：** 无 TBD/TODO。所有代码块完整。

**3. 类型一致性：** `McpError::InvalidParams`、`McpResult<Value>` 等类型在任务间保持一致。`handle_preview` 签名前后统一。

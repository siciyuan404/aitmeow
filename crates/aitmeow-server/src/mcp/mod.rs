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
            _ => Err(McpError::MethodNotFound(format!("unknown method: {}", method))),
        }
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
}

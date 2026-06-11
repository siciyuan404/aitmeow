use crate::api::session;
use crate::app_state::AppState;
use serde_json::{json, Value};
use std::collections::HashMap;

pub struct McpRouter;

impl McpRouter {
    pub async fn handle_request(state: &AppState, method: &str, params: &Value) -> Result<Value, String> {
        match method {
            "initialize" => Ok(Self::handle_initialize()),
            "notifications/initialized" => Ok(serde_json::Value::Null),
            "tools/list" => Ok(Self::list_tools()),
            "tools/call" => {
                let name = params.get("name").and_then(|v| v.as_str()).ok_or("missing 'name' param for tools/call")?;
                let args = params.get("arguments").cloned().unwrap_or(Value::Null);
                Self::call_tool(state, name, &args).await
            }
            _ => Self::dispatch(state, method, params).await,
        }
    }

    async fn call_tool(state: &AppState, name: &str, args: &Value) -> Result<Value, String> {
        let result = Self::dispatch(state, name, args).await?;
        let text = serde_json::to_string_pretty(&result).map_err(|e| format!("serialization error: {}", e))?;
        Ok(json!({ "content": [{ "type": "text", "text": text }] }))
    }

    async fn dispatch(state: &AppState, name: &str, params: &Value) -> Result<Value, String> {
        match name {
            "svg_preview" => Self::handle_preview(state, params).await,
            _ => Err(format!("unknown method: {}", name)),
        }
    }

    async fn handle_preview(state: &AppState, params: &Value) -> Result<Value, String> {
        let svg_content = params.get("svg_content").and_then(|v| v.as_str()).ok_or("missing 'svg_content' param")?;
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
            "capabilities": {
                "tools": {}
            }
        })
    }

    fn list_tools() -> Value {
        json!({
            "tools": [
                {
                    "name": "svg_preview",
                    "description": "Submit SVG content to the desktop for real-time preview. Call this after generating SVG. The session context includes compiled_prompt (compiled generation instruction from selected template + template_params), selected_template, template_params, and reference_svg (if user selected a reference from the repo). Workflow: (1) optionally call session_state to get compiled_prompt context, (2) generate SVG based on compiled_prompt/reference_svg, (3) call svg_preview to push result to desktop.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "svg_content": { "type": "string", "description": "Generated SVG content to preview on desktop" },
                            "template_name": { "type": "string", "description": "Template name used for generation (default: quick-preview)" },
                            "params": { "type": "object", "description": "Template parameters used", "additionalProperties": { "type": "string" } }
                        },
                        "required": ["svg_content"]
                    }
                }
            ]
        })
    }
}

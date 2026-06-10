use crate::app_state::AppState;
use serde_json::{json, Value};

pub struct McpRouter;

impl McpRouter {
    pub async fn handle_request(state: &AppState, method: &str, params: &Value) -> Result<Value, String> {
        match method {
            "svg_validate" => {
                let svg = params.get("svg").and_then(|v| v.as_str()).ok_or("missing 'svg' param")?;
                let rules_json = params.get("rules").cloned();
                let rules = if let Some(rj) = rules_json {
                    crate::mcp::parse_rules(&rj, state.config.max_svg_size)
                } else {
                    state.rule_engine.rules.clone()
                };

                let result = aitmeow_core::svg::validate_svg(svg, &rules)
                    .map_err(|e| e.to_string())?;

                Ok(serde_json::to_value(&result).unwrap_or_default())
            }
            "svg_render" => {
                let svg = params.get("svg").and_then(|v| v.as_str()).ok_or("missing 'svg' param")?;
                let width = params.get("width").and_then(|v| v.as_u64()).map(|w| w as u32);
                let height = params.get("height").and_then(|v| v.as_u64()).map(|h| h as u32);
                let bg = params.get("background_color").and_then(|v| v.as_str()).map(String::from);

                let opts = aitmeow_core::svg::RenderOptions {
                    width,
                    height,
                    background_color: bg,
                    format: aitmeow_core::svg::OutputFormat::Png,
                };

                let png = aitmeow_core::svg::render_svg(svg, &opts)
                    .map_err(|e| e.to_string())?;

                let base64 = base64_encode(&png);

                Ok(json!({
                    "data": format!("data:image/png;base64,{}", base64),
                    "format": "png",
                    "size_bytes": png.len()
                }))
            }
            "svg_save" => {
                let name = params.get("name").and_then(|v| v.as_str()).ok_or("missing 'name' param")?;
                let svg_content = params.get("svg_content").and_then(|v| v.as_str()).ok_or("missing 'svg_content' param")?;
                let template_name = params.get("template_name").and_then(|v| v.as_str()).map(String::from);
                let tags: Vec<String> = params.get("tags")
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                    .unwrap_or_default();

                let record = aitmeow_core::repository::SvgRecord::new(name.to_string(), svg_content.to_string())
                    .with_template(template_name.unwrap_or_default())
                    .with_tags(tags);

                state.repository.save(&record).await.map_err(|e| e.to_string())?;

                Ok(serde_json::to_value(&record).unwrap_or_default())
            }
            "svg_list" => {
                let opts = aitmeow_core::repository::ListOptions::default();
                let items = state.repository.list(&opts).await.map_err(|e| e.to_string())?;
                Ok(serde_json::to_value(&items).unwrap_or_default())
            }
            "svg_search" => {
                let query = params.get("query").and_then(|v| v.as_str()).unwrap_or("");
                let tags: Vec<String> = params.get("tags")
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                    .unwrap_or_default();

                let results = state.repository.search(query, &tags).await.map_err(|e| e.to_string())?;
                Ok(serde_json::to_value(&results).unwrap_or_default())
            }
            "svg_delete" => {
                let id = params.get("id").and_then(|v| v.as_str()).ok_or("missing 'id' param")?;
                let deleted = state.repository.delete(id).await.map_err(|e| e.to_string())?;
                Ok(json!({ "deleted": deleted }))
            }
            "template_list" => {
                let templates = state.template_registry.list();
                Ok(serde_json::to_value(templates).unwrap_or_default())
            }
            "template_get" => {
                let name = params.get("name").and_then(|v| v.as_str()).ok_or("missing 'name' param")?;
                let tmpl = state.template_registry.get(name).ok_or("template not found")?;
                Ok(serde_json::to_value(tmpl).unwrap_or_default())
            }
            "server_health" => {
                Ok(json!({
                    "status": "ok",
                    "service": "aitmeow",
                    "version": env!("CARGO_PKG_VERSION"),
                    "port": state.config.port
                }))
            }
            _ => Err(format!("unknown method: {}", method)),
        }
    }
}

fn base64_encode(data: &[u8]) -> String {
    use std::fmt::Write;
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    let mut result = String::new();
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let combined = (b0 << 16) | (b1 << 8) | b2;

        write!(result, "{}", CHARS[((combined >> 18) & 0x3F) as usize] as char).unwrap();
        write!(result, "{}", CHARS[((combined >> 12) & 0x3F) as usize] as char).unwrap();

        if chunk.len() > 1 {
            write!(result, "{}", CHARS[((combined >> 6) & 0x3F) as usize] as char).unwrap();
        } else {
            result.push('=');
        }

        if chunk.len() > 2 {
            write!(result, "{}", CHARS[(combined & 0x3F) as usize] as char).unwrap();
        } else {
            result.push('=');
        }
    }
    result
}

pub fn parse_rules(rules_json: &Value, max_size: usize) -> Vec<aitmeow_core::rule::Rule> {
    use aitmeow_core::rule::Rule;

    let mut rules = Vec::new();
    if let Some(arr) = rules_json.as_array() {
        for item in arr {
            if let Some(name) = item.as_str() {
                match name {
                    "max_size" => rules.push(Rule::MaxSize(max_size)),
                    "viewbox" => rules.push(Rule::CheckViewBox),
                    "require_ids" => rules.push(Rule::RequireIds),
                    _ => {}
                }
            }
        }
    }
    rules
}

use crate::app_state::AppState;
use aitmeow_core::rule::Rule;
use aitmeow_core::svg::{render_svg, validate_svg, OutputFormat, RenderOptions};
use axum::{extract::State, http::StatusCode, Json};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ValidateRequest {
    pub svg: String,
    #[serde(default)]
    pub rules: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct RenderRequest {
    pub svg: String,
    #[serde(default)]
    pub width: Option<u32>,
    #[serde(default)]
    pub height: Option<u32>,
    #[serde(default)]
    pub background_color: Option<String>,
}

pub async fn validate(
    State(state): State<AppState>,
    Json(req): Json<ValidateRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let rules = if let Some(rule_names) = &req.rules {
        let mut r = Vec::new();
        for name in rule_names {
            match name.as_str() {
                "viewbox" => r.push(Rule::CheckViewBox),
                "require_ids" => r.push(Rule::RequireIds),
                "max_size" => r.push(Rule::MaxSize(state.config.max_svg_size)),
                _ => {}
            }
        }
        r
    } else {
        state.rule_engine.rules.clone()
    };

    match validate_svg(&req.svg, &rules) {
        Ok(result) => {
            let val = serde_json::to_value(&result).unwrap_or_default();
            (StatusCode::OK, Json(val))
        }
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": e.to_string()})),
        ),
    }
}

pub async fn render(
    State(_state): State<AppState>,
    Json(req): Json<RenderRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let opts = RenderOptions {
        width: req.width,
        height: req.height,
        background_color: req.background_color,
        format: OutputFormat::Png,
    };

    match render_svg(&req.svg, &opts) {
        Ok(png_data) => {
            use base64::Engine;
            let base64 = base64::engine::general_purpose::STANDARD.encode(&png_data);
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "data": format!("data:image/png;base64,{}", base64),
                    "format": "png",
                    "size_bytes": png_data.len()
                })),
            )
        }
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": e.to_string()})),
        ),
    }
}

use crate::app_state::AppState;
use crate::session::{GenerationResult, ReferenceSvg, SessionEvent};
use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Deserialize)]
pub struct UpdateStateRequest {
    #[serde(default)]
    pub selected_template: Option<String>,
    #[serde(default)]
    pub template_params: Option<HashMap<String, String>>,
    #[serde(default)]
    pub active_rules: Option<Vec<String>>,
    #[serde(default)]
    pub pending_svg: Option<String>,
    #[serde(default)]
    pub clear_pending: bool,
}

pub async fn get_state(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let session = state.session.read().await;

    // 尝试编译 prompt
    let compiled_prompt = if let Some(ref tmpl_name) = session.selected_template {
        state
            .template_registry
            .get(tmpl_name)
            .map(|tmpl| {
                aitmeow_core::template::compile_prompt(tmpl, &session.template_params)
                    .unwrap_or_else(|_| tmpl.prompt_template.clone())
            })
    } else {
        None
    };

    let resp = serde_json::json!({
        "selected_template": session.selected_template,
        "template_params": session.template_params,
        "active_rules": session.active_rules,
        "compiled_prompt": compiled_prompt,
        "reference_svg": session.reference_svg,
        "pending_svg": session.pending_svg,
        "pending_generation": session.pending_generation,
    });

    Ok(Json(resp))
}

pub async fn update_state(
    State(state): State<AppState>,
    Json(req): Json<UpdateStateRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let mut session = state.session.write().await;

    if let Some(template) = req.selected_template {
        session.selected_template = Some(template);
    }
    if let Some(params) = req.template_params {
        session.template_params = params;
    }
    if let Some(rules) = req.active_rules {
        session.active_rules = rules;
    }
    if let Some(svg) = req.pending_svg {
        session.pending_svg = Some(svg);
    }
    if req.clear_pending {
        session.pending_generation = None;
        session.pending_svg = None;
    }

    // 广播状态更新事件
    let _ = session.tx.send(SessionEvent::StateUpdated {
        template: session.selected_template.clone(),
        params: session.template_params.clone(),
    });

    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Debug, Deserialize)]
pub struct SetReferenceRequest {
    pub reference_svg: Option<ReferenceSvg>,
}

pub async fn set_reference(
    State(state): State<AppState>,
    Json(req): Json<SetReferenceRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let mut session = state.session.write().await;
    session.reference_svg = req.reference_svg;
    Ok(Json(serde_json::json!({ "ok": true })))
}

/// Claude Code 通过 MCP 调用的内部方法 —— 提交生成结果并广播
pub async fn publish_generation_internal(
    state: &AppState,
    template_name: &str,
    params: &HashMap<String, String>,
    svg_content: &str,
) -> GenerationResult {
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis().to_string())
        .unwrap_or_default();

    let result = GenerationResult {
        id: id.clone(),
        template_name: template_name.to_string(),
        params: params.clone(),
        svg_content: svg_content.to_string(),
        created_at,
    };

    {
        let mut session = state.session.write().await;
        session.pending_generation = Some(result.clone());
        let _ = session.tx.send(SessionEvent::GenerationReady(result.clone()));
    }

    result
}

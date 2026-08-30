use crate::app_state::AppState;
use crate::session::{GenerationResult, ReferenceSvg, SessionEvent};
use aitmeow_core::iconspec::ReferenceItem;
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

/// 参考图片上传请求（PNG 原始字节 base64 编码）
#[derive(Debug, Deserialize)]
pub struct ReferenceImageRequest {
    /// base64 编码的 PNG 图片数据
    pub image_base64: String,
    /// 预处理配置（可选）
    #[serde(default)]
    pub resize: Option<String>,
    #[serde(default)]
    pub edge_detect: Option<String>,
    #[serde(default)]
    pub quantize_colors: Option<usize>,
    #[serde(default)]
    pub threshold: Option<u8>,
    #[serde(default)]
    pub invert: bool,
}

pub async fn get_state(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let session = state.session.read().await;

    // 尝试编译 prompt（注入参考图片后编译）
    let compiled_prompt = if let Some(ref tmpl_name) = session.selected_template {
        let registry = state.template_registry.read().await;
        registry
            .get(tmpl_name)
            .map(|tmpl| {
                let mut tmpl_clone = tmpl.clone();
                if let Some(ref img_data) = session.reference_image {
                    tmpl_clone.inject_reference_image(img_data.clone());
                }
                aitmeow_core::template::compile_prompt(&tmpl_clone, &session.template_params)
                    .unwrap_or_else(|_| tmpl.prompt_template.clone())
            })
    } else {
        None
    };

    let has_reference_image = session.reference_image.is_some();

    let resp = serde_json::json!({
        "selected_template": session.selected_template,
        "template_params": session.template_params,
        "active_rules": session.active_rules,
        "compiled_prompt": compiled_prompt,
        "reference_svg": session.reference_svg,
        "reference_items": session.reference_items,
        "pending_svg": session.pending_svg,
        "pending_generation": session.pending_generation,
        "has_reference_image": has_reference_image,
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

#[derive(Debug, Deserialize)]
pub struct SetReferencesRequest {
    pub items: Vec<ReferenceItem>,
}

/// 整体替换参考元素列表。前端拖拽是「加一个」，由前端先读再写回。
pub async fn set_references(
    State(state): State<AppState>,
    Json(req): Json<SetReferencesRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let mut session = state.session.write().await;
    session.reference_items = req
        .items
        .into_iter()
        .filter(|i| !i.name.trim().is_empty())
        .collect();
    Ok(Json(serde_json::json!({
        "ok": true,
        "count": session.reference_items.len(),
    })))
}

pub async fn get_references(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let session = state.session.read().await;
    Ok(Json(serde_json::json!({ "items": session.reference_items })))
}

/// 追加一个参考元素，重名会覆盖已有的那条。
pub async fn add_reference(
    State(state): State<AppState>,
    Json(item): Json<ReferenceItem>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    if item.name.trim().is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }
    let mut session = state.session.write().await;
    session.reference_items.retain(|i| i.name != item.name);
    session.reference_items.push(item);
    Ok(Json(serde_json::json!({
        "ok": true,
        "count": session.reference_items.len(),
    })))
}

pub async fn clear_references(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let mut session = state.session.write().await;
    session.reference_items.clear();
    Ok(Json(serde_json::json!({ "ok": true })))
}

/// 上传参考图片 —— 桌面端将 PNG base64 存入 session
pub async fn set_reference_image(
    State(state): State<AppState>,
    Json(req): Json<ReferenceImageRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // 解码 base64
    use base64::{Engine as _, engine::general_purpose};
    let image_data = match general_purpose::STANDARD.decode(&req.image_base64) {
        Ok(data) => data,
        Err(e) => {
            return Ok(Json(serde_json::json!({
                "ok": false,
                "error": format!("Base64 decode failed: {e}")
            })));
        }
    };

    // 验证 PNG 签名
    if image_data.len() < 8 || &image_data[..4] != b"\x89PNG" {
        return Ok(Json(serde_json::json!({
            "ok": false,
            "error": "Not a valid PNG file"
        })));
    }

    let mut session = state.session.write().await;
    session.reference_image = Some(image_data);

    // 如果有预处理配置，可以在这里提前运行管线，生成 feature text 存入 session

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

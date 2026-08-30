//! 图标生成：把 IconSpec 套到 SVG 上、编译 prompt、批量入库成集合。
//!
//! 批量入库是「结果托盘 → 打包存入仓库」那一跳的服务端实现：
//! 建集合 → 逐条套蒙版 → 打上帧号 → 写进同一个集合。

use crate::app_state::AppState;
use aitmeow_core::iconspec::{
    apply_spec, compile_icon_prompt, IconPromptRequest, IconSpec, ReferenceItem,
};
use aitmeow_core::repository::{Collection, CollectionKind, CollectionSummary, SvgRecord};
use axum::{extract::State, http::StatusCode, Json};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ApplyRequest {
    pub svg: String,
    pub spec: IconSpec,
}

#[derive(Debug, Deserialize)]
pub struct PromptRequest {
    pub user_prompt: String,
    pub spec: IconSpec,
    #[serde(default)]
    pub refs: Vec<ReferenceItem>,
    /// `[帧序号, 总帧数]`，非动画不传
    #[serde(default)]
    pub frame: Option<(u32, u32)>,
}

#[derive(Debug, Deserialize)]
pub struct BatchItem {
    pub name: String,
    pub svg_content: String,
    /// 动画帧序号，从 0 开始
    #[serde(default)]
    pub frame_index: Option<u32>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchSaveRequest {
    pub collection_name: String,
    /// 有帧号就按 frameset 建，否则按 batch
    #[serde(default)]
    pub kind: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    /// 入库前是否对每张套一次蒙版
    #[serde(default)]
    pub apply: bool,
    pub spec: IconSpec,
    pub items: Vec<BatchItem>,
}

#[derive(Debug, serde::Serialize)]
pub struct BatchSaveResponse {
    pub collection: CollectionSummary,
    pub saved: usize,
    pub failed: Vec<String>,
}

/// 把设定套到一段 SVG 上，返回合成后的 SVG。
pub async fn apply(
    State(_state): State<AppState>,
    Json(req): Json<ApplyRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    match apply_spec(&req.svg, &req.spec) {
        Ok(svg) => (
            StatusCode::OK,
            Json(serde_json::json!({ "svg": svg, "bytes": svg.len() })),
        ),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}

/// 编译给模型的 prompt。前端预览、MCP 工具都走这一个口径。
pub async fn prompt(
    State(_state): State<AppState>,
    Json(req): Json<PromptRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let request = IconPromptRequest {
        user_prompt: &req.user_prompt,
        spec: &req.spec,
        refs: &req.refs,
        frame: req.frame,
    };

    match compile_icon_prompt(&request) {
        Ok(prompt) => (
            StatusCode::OK,
            Json(serde_json::json!({ "prompt": prompt })),
        ),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        ),
    }
}

/// 建集合 + 批量入库。任何一条失败都会记进 `failed`，不影响其余条目。
pub async fn batch_save(
    State(state): State<AppState>,
    Json(req): Json<BatchSaveRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    if req.collection_name.trim().is_empty() || req.items.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "集合名和条目列表都不能为空" })),
        );
    }

    if let Err(e) = req.spec.validate() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e.to_string() })),
        );
    }

    let has_frames = req.items.iter().any(|i| i.frame_index.is_some());
    let kind = match req.kind.as_deref() {
        Some("frameset") => CollectionKind::Frameset,
        Some("manual") => CollectionKind::Manual,
        Some(_) | None if has_frames => CollectionKind::Frameset,
        _ => CollectionKind::Batch,
    };

    let collection = Collection::new(req.collection_name.trim(), kind)
        .with_tags(req.tags)
        .with_preset(req.spec.clone());

    if let Err(e) = state.repository.save_collection(&collection).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        );
    }

    let mut saved = 0usize;
    let mut failed = Vec::new();

    for item in &req.items {
        let content = if req.apply {
            match apply_spec(&item.svg_content, &req.spec) {
                Ok(s) => s,
                Err(e) => {
                    failed.push(format!("{}: {}", item.name, e));
                    continue;
                }
            }
        } else {
            item.svg_content.clone()
        };

        let mut record = SvgRecord::new(item.name.clone(), content)
            .with_collection(&collection.id)
            .with_tags(item.tags.clone())
            .with_preset(req.spec.clone());
        if let Some(idx) = item.frame_index {
            record = record.with_frame(idx);
        }

        match state.repository.save(&record).await {
            Ok(()) => saved += 1,
            Err(e) => failed.push(format!("{}: {}", item.name, e)),
        }
    }

    let summary = match state.repository.get_collection(&collection.id).await {
        Ok(Some(c)) => CollectionSummary {
            id: c.id,
            name: c.name,
            kind: c.kind,
            tags: c.tags,
            preset: c.preset,
            created_at: c.created_at,
            updated_at: c.updated_at,
            item_count: saved as i64,
        },
        _ => CollectionSummary {
            id: collection.id,
            name: collection.name,
            kind: collection.kind,
            tags: collection.tags,
            preset: collection.preset,
            created_at: collection.created_at,
            updated_at: collection.updated_at,
            item_count: saved as i64,
        },
    };

    (
        StatusCode::CREATED,
        Json(serde_json::json!(BatchSaveResponse {
            collection: summary,
            saved,
            failed,
        })),
    )
}

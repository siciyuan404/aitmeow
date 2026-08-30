use crate::app_state::AppState;
use aitmeow_core::iconspec::IconSpec;
use aitmeow_core::repository::{ListOptions, RecordType};
use aitmeow_core::repository::SvgRecord;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    #[serde(default)]
    pub offset: Option<u32>,
    #[serde(default)]
    pub limit: Option<u32>,
    #[serde(default)]
    pub sort_by: Option<String>,
    #[serde(default)]
    pub sort_order: Option<String>,
    #[serde(default)]
    pub tag: Option<String>,
    /// 只列某个集合内的条目
    #[serde(default)]
    pub collection_id: Option<String>,
    /// `result`（成品）或 `asset`（素材），不传则两者都要
    #[serde(default)]
    pub record_type: Option<String>,
    /// 只要未归入任何集合的条目
    #[serde(default)]
    pub uncollected: bool,
}

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    #[serde(default)]
    pub q: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct SaveRequest {
    pub name: String,
    pub svg_content: String,
    #[serde(default)]
    pub template_name: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub params: HashMap<String, String>,
    #[serde(default)]
    pub width: Option<u32>,
    #[serde(default)]
    pub height: Option<u32>,
    #[serde(default)]
    pub collection_id: Option<String>,
    #[serde(default)]
    pub frame_index: Option<u32>,
    /// `result`（成品）或 `asset`（素材），缺省 `result`
    #[serde(default)]
    pub record_type: Option<String>,
    /// 生成这份素材时的设定快照
    #[serde(default)]
    pub preset: Option<IconSpec>,
}

#[derive(Debug, Serialize)]
pub struct SvgListResponse {
    pub items: Vec<SvgRecord>,
    pub total: i64,
}

pub async fn list_svgs(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<SvgListResponse>, StatusCode> {
    let opts = ListOptions {
        offset: query.offset.unwrap_or(0),
        limit: query.limit.unwrap_or(20).min(100),
        sort_by: query.sort_by.unwrap_or_else(|| "created_at".to_string()),
        sort_order: query.sort_order.unwrap_or_else(|| "desc".to_string()),
        tag: query.tag,
        category: None,
        collection_id: query.collection_id,
        record_type: query.record_type.as_deref().map(RecordType::parse),
        uncollected: query.uncollected,
    };

    let items = state
        .repository
        .list(&opts)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    // 必须用同一份过滤条件统计，否则分页页数会算错
    let total = state
        .repository
        .count_filtered(&opts)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(SvgListResponse { items, total }))
}

pub async fn save_svg(
    State(state): State<AppState>,
    Json(req): Json<SaveRequest>,
) -> Result<(StatusCode, Json<SvgRecord>), StatusCode> {
    let mut record = SvgRecord::new(req.name, req.svg_content)
        .with_template(req.template_name.unwrap_or_default())
        .with_tags(req.tags)
        .with_params(req.params)
        .with_record_type(RecordType::parse(
            req.record_type.as_deref().unwrap_or("result"),
        ));

    if let Some(id) = req.collection_id {
        record = record.with_collection(id);
    }
    if let Some(idx) = req.frame_index {
        record = record.with_frame(idx);
    }
    if let Some(preset) = req.preset {
        record = record.with_preset(preset);
    }

    let record = SvgRecord {
        width: req.width,
        height: req.height,
        ..record
    };

    state
        .repository
        .save(&record)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(record)))
}

pub async fn get_svg(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<SvgRecord>, StatusCode> {
    let record = state
        .repository
        .get(&id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(record))
}

pub async fn delete_svg(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.repository.delete(&id).await {
        Ok(true) => (
            StatusCode::OK,
            Json(serde_json::json!({"deleted": true})),
        ),
        Ok(false) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "not found"})),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        ),
    }
}

pub async fn search_svgs(
    State(state): State<AppState>,
    Query(query): Query<SearchQuery>,
) -> Result<Json<Vec<SvgRecord>>, StatusCode> {
    let q = query.q.unwrap_or_default();
    let tags = query.tags.unwrap_or_default();
    let results = state
        .repository
        .search(&q, &tags)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(results))
}

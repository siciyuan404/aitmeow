use crate::app_state::AppState;
use aitmeow_core::repository::ListOptions;
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
    };

    let items = state
        .repository
        .list(&opts)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let total = state
        .repository
        .count()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(SvgListResponse { items, total }))
}

pub async fn save_svg(
    State(state): State<AppState>,
    Json(req): Json<SaveRequest>,
) -> Result<(StatusCode, Json<SvgRecord>), StatusCode> {
    let record = SvgRecord::new(req.name, req.svg_content)
        .with_template(req.template_name.unwrap_or_default())
        .with_tags(req.tags)
        .with_params(req.params);

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

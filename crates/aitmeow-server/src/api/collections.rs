//! 仓库集合：批量生成结果的分组，以及整库导入导出。

use crate::app_state::AppState;
use aitmeow_core::iconspec::IconSpec;
use aitmeow_core::repository::{
    Collection, CollectionKind, CollectionSummary, DatabaseExport, ImportMode, ListOptions,
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct CreateCollectionRequest {
    pub name: String,
    /// `batch` / `frameset` / `manual`，缺省按 `manual`
    #[serde(default)]
    pub kind: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    /// 建集合时的图标设定快照，整批重跑时直接复用
    #[serde(default)]
    pub preset: Option<IconSpec>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCollectionRequest {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub preset: Option<IconSpec>,
}

#[derive(Debug, Deserialize)]
pub struct AddItemsRequest {
    pub ids: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListItemsQuery {
    #[serde(default)]
    pub offset: Option<u32>,
    #[serde(default)]
    pub limit: Option<u32>,
    /// 帧序列集合按帧号排序，否则翻页顺序会乱
    #[serde(default)]
    pub sort_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ImportRequest {
    pub bundle: DatabaseExport,
    /// `replace` / `merge`，缺省 `merge`
    #[serde(default)]
    pub mode: Option<String>,
}

pub async fn list_collections(
    State(state): State<AppState>,
) -> Result<Json<Vec<CollectionSummary>>, StatusCode> {
    state
        .repository
        .list_collections()
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn create_collection(
    State(state): State<AppState>,
    Json(req): Json<CreateCollectionRequest>,
) -> Result<(StatusCode, Json<Collection>), StatusCode> {
    if req.name.trim().is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let mut c = Collection::new(
        req.name.trim(),
        CollectionKind::parse(req.kind.as_deref().unwrap_or("manual")),
    )
    .with_tags(req.tags);

    if let Some(preset) = req.preset {
        preset
            .validate()
            .map_err(|_| StatusCode::BAD_REQUEST)?;
        c = c.with_preset(preset);
    }

    state
        .repository
        .save_collection(&c)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(c)))
}

pub async fn get_collection(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Collection>, StatusCode> {
    state
        .repository
        .get_collection(&id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

pub async fn update_collection(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateCollectionRequest>,
) -> Result<Json<Collection>, StatusCode> {
    let mut c = state
        .repository
        .get_collection(&id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    if let Some(name) = req.name {
        if name.trim().is_empty() {
            return Err(StatusCode::BAD_REQUEST);
        }
        c.name = name.trim().to_string();
    }
    if let Some(tags) = req.tags {
        c.tags = tags;
    }
    if let Some(preset) = req.preset {
        preset.validate().map_err(|_| StatusCode::BAD_REQUEST)?;
        c.preset = Some(preset);
    }
    c.touch();

    state
        .repository
        .save_collection(&c)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(c))
}

/// 删集合。条目不会被连带删除，只解绑回仓库根目录。
pub async fn delete_collection(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.repository.delete_collection(&id).await {
        Ok(true) => (
            StatusCode::OK,
            Json(serde_json::json!({"deleted": true, "items_unbound": true})),
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

pub async fn list_collection_items(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Query(q): Query<ListItemsQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    if state
        .repository
        .get_collection(&id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .is_none()
    {
        return Err(StatusCode::NOT_FOUND);
    }

    let opts = ListOptions {
        offset: q.offset.unwrap_or(0),
        limit: q.limit.unwrap_or(60).min(200),
        sort_by: q.sort_by.unwrap_or_else(|| "created_at".to_string()),
        sort_order: "asc".to_string(),
        collection_id: Some(id),
        ..Default::default()
    };

    let items = state
        .repository
        .list(&opts)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let total = state
        .repository
        .count_filtered(&opts)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "items": items, "total": total })))
}

/// 把已有条目挪进集合（结果托盘「打包存入仓库」走这里）。
pub async fn add_items(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<AddItemsRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    if state
        .repository
        .get_collection(&id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .is_none()
    {
        return Err(StatusCode::NOT_FOUND);
    }

    let n = state
        .repository
        .assign_to_collection(&id, &req.ids)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "assigned": n })))
}

pub async fn export_database(
    State(state): State<AppState>,
) -> Result<Json<DatabaseExport>, StatusCode> {
    state
        .repository
        .export_all()
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn import_database(
    State(state): State<AppState>,
    Json(req): Json<ImportRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let mode = match req.mode.as_deref() {
        Some("replace") => ImportMode::Replace,
        _ => ImportMode::Merge,
    };

    match state.repository.import_all(req.bundle, mode).await {
        Ok(report) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "ok": true,
                "mode": match mode {
                    ImportMode::Replace => "replace",
                    ImportMode::Merge => "merge",
                },
                "report": report,
            })),
        ),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "ok": false, "error": e.to_string() })),
        ),
    }
}

/// 当前库文件在哪，供设置页显示和「打开所在目录」用。
pub async fn repository_info(
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
    let path = state.config.db_path.clone();
    let exists = path.exists();
    let size_bytes = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
    let record_count = state.repository.count().await.unwrap_or(0);

    Json(serde_json::json!({
        "db_path": path.display().to_string(),
        "exists": exists,
        "size_bytes": size_bytes,
        "record_count": record_count,
    }))
}

use crate::app_state::AppState;
use axum::{extract::State, http::StatusCode, Json};

pub async fn list_templates(
    State(state): State<AppState>,
) -> (StatusCode, Json<serde_json::Value>) {
    let registry = state.template_registry.read().await;
    let templates = registry.list();
    let categories = registry.categories();

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "templates": templates,
            "categories": categories,
            "total": templates.len()
        })),
    )
}

pub async fn get_template(
    State(state): State<AppState>,
    axum::extract::Path(name): axum::extract::Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let registry = state.template_registry.read().await;
    let tmpl = registry
        .get(&name)
        .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(serde_json::to_value(tmpl).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?))
}

pub async fn create_template(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, String)> {
    let tmpl: aitmeow_core::template::Template = serde_json::from_value(body)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid template: {}", e)))?;

    let template_dir = state.config.template_dirs.first()
        .ok_or_else(|| (StatusCode::INTERNAL_SERVER_ERROR, "No template directory configured".into()))?;

    let mut registry = state.template_registry.write().await;
    registry.create(template_dir, tmpl.clone())
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Failed to create: {}", e)))?;

    Ok((StatusCode::CREATED, Json(serde_json::to_value(tmpl)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?)))
}

pub async fn update_template(
    State(state): State<AppState>,
    axum::extract::Path(name): axum::extract::Path<String>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let tmpl: aitmeow_core::template::Template = serde_json::from_value(body)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid template: {}", e)))?;

    // Ensure name matches path parameter
    if tmpl.name != name {
        return Err((StatusCode::BAD_REQUEST, "Template name mismatch".into()));
    }

    let template_dir = state.config.template_dirs.first()
        .ok_or_else(|| (StatusCode::INTERNAL_SERVER_ERROR, "No template directory configured".into()))?;

    let mut registry = state.template_registry.write().await;
    registry.update(template_dir, tmpl.clone())
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Failed to update: {}", e)))?;

    Ok(Json(serde_json::to_value(tmpl)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?))
}

pub async fn delete_template(
    State(state): State<AppState>,
    axum::extract::Path(name): axum::extract::Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut registry = state.template_registry.write().await;
    registry.delete(&name)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Failed to delete: {}", e)))?;

    Ok(Json(serde_json::json!({ "deleted": true })))
}

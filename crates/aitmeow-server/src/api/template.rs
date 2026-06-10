use crate::app_state::AppState;
use axum::{extract::State, http::StatusCode, Json};

pub async fn list_templates(
    State(state): State<AppState>,
) -> (StatusCode, Json<serde_json::Value>) {
    let templates = state.template_registry.list();
    let categories = state.template_registry.categories();

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
    let tmpl = state
        .template_registry
        .get(&name)
        .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(serde_json::to_value(tmpl).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?))
}

use axum::{http::StatusCode, Json};

pub async fn health() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "status": "ok",
            "service": "aitmeow",
            "version": env!("CARGO_PKG_VERSION")
        })),
    )
}

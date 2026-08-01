use crate::api::{health, repo, session as session_api, svg, template};
use crate::app_state::AppState;
use crate::mcp::McpRouter;
use axum::{
	routing::get,
	routing::post,
	Json, Router,
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::limit::RequestBodyLimitLayer;

pub fn create_router(state: AppState) -> Router {
	let cors = CorsLayer::new()
		.allow_origin(Any)
		.allow_methods(Any)
		.allow_headers(Any);

	Router::new()
		.route("/api/validate", post(svg::validate))
		.route("/api/render", post(svg::render))
		.route("/api/sanitize", post(svg::sanitize_handler))
		.route("/api/svg", get(repo::list_svgs).post(repo::save_svg))
		.route("/api/svg/{id}", get(repo::get_svg).delete(repo::delete_svg))
		.route("/api/svg/search", get(repo::search_svgs))
		.route("/api/template", get(template::list_templates).post(template::create_template))
		.route("/api/template/{name}",
			get(template::get_template)
			.put(template::update_template)
			.delete(template::delete_template))
		.route("/api/health", get(health::health))
		.route("/api/session/state", get(session_api::get_state).post(session_api::update_state))
		.route("/api/session/reference", post(session_api::set_reference))
		.route("/api/session/reference-image", post(session_api::set_reference_image))
		.route("/ws/preview", get(crate::ws::ws_handler))
		.route("/mcp", post(handle_mcp))
		.layer(RequestBodyLimitLayer::new(10 * 1024 * 1024))
		.layer(cors)
		.with_state(state)
}

async fn handle_mcp(
	axum::extract::State(state): axum::extract::State<AppState>,
	Json(body): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
	let method = body.get("method").and_then(|v| v.as_str()).unwrap_or("");
	let params = body.get("params").cloned().unwrap_or(serde_json::Value::Null);
	let id = body.get("id").cloned().unwrap_or(serde_json::Value::Null);

	match McpRouter::handle_request(&state, method, &params).await {
		Ok(result) => Json(serde_json::json!({
			"jsonrpc": "2.0", "id": id, "result": result
		})),
		Err(err) => Json(serde_json::json!({
			"jsonrpc": "2.0", "id": id, "error": err.to_json_rpc_error()
		})),
	}
}

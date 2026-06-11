use aitmeow_core::config::Config;
use aitmeow_core::repository::Repository;
use aitmeow_core::rule::RuleEngine;
use aitmeow_core::template::TemplateRegistry;
use aitmeow_server::app_state::AppState;
use aitmeow_server::session::SessionState;
use aitmeow_server::mcp::McpRouter;
use serde_json::json;
use std::sync::Arc;
use tokio::sync::RwLock;

async fn build_test_state() -> AppState {
    let config = Config::load_for_test();
    let repository = Repository::open_memory().await.unwrap();
    let template_registry = TemplateRegistry::new();
    let rule_engine = RuleEngine::default_rules();
    AppState {
        repository: Arc::new(repository),
        template_registry: Arc::new(template_registry),
        rule_engine: Arc::new(rule_engine),
        config: Arc::new(config),
        session: Arc::new(RwLock::new(SessionState::new())),
    }
}

#[tokio::test]
async fn test_mcp_initialize() {
    let state = build_test_state().await;
    let result = McpRouter::handle_request(&state, "initialize", &json!(null)).await;
    assert!(result.is_ok());
    let val = result.unwrap();
    assert_eq!(val["protocolVersion"], "2024-11-05");
    assert_eq!(val["serverInfo"]["name"], "aitmeow");
}

#[tokio::test]
async fn test_mcp_tools_list() {
    let state = build_test_state().await;
    let result = McpRouter::handle_request(&state, "tools/list", &json!(null)).await;
    assert!(result.is_ok());
    let val = result.unwrap();
    let tools = val["tools"].as_array().unwrap();
    assert_eq!(tools.len(), 1);
    assert_eq!(tools[0]["name"], "svg_preview");
}

#[tokio::test]
async fn test_mcp_svg_preview() {
    let state = build_test_state().await;
    let params = json!({
        "name": "svg_preview",
        "arguments": {
            "svg_content": "<svg xmlns='http://www.w3.org/2000/svg'></svg>"
        }
    });
    let result = McpRouter::handle_request(&state, "tools/call", &params).await;
    assert!(result.is_ok());
    let val = result.unwrap();
    // Should be wrapped in MCP content envelope
    let content = val["content"].as_array().unwrap();
    assert_eq!(content[0]["type"], "text");
    let inner: serde_json::Value = serde_json::from_str(content[0]["text"].as_str().unwrap()).unwrap();
    assert_eq!(inner["status"], "accepted");
    assert!(inner["generation_id"].is_string());
}

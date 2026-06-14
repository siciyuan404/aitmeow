use aitmeow_core::config::Config;
use aitmeow_server::app_state::AppState;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use tower::ServiceExt;

#[tokio::test]
async fn test_template_crud_flow() {
    let temp_dir = tempfile::tempdir().unwrap();
    let mut config = Config::load_for_test()
        .with_db_path(temp_dir.path().join("test.db"));

    // Add template directory
    config.template_dirs = vec![temp_dir.path().to_path_buf()];

    let state = AppState::new(&config).await.unwrap();
    let app = aitmeow_server::http::create_router(state);

    // Create template
    let create_body = serde_json::json!({
        "name": "test-template",
        "description": "Test template",
        "category": "test",
        "prompt_template": "Test prompt with {{param1}}",
        "options": [
            {
                "type": "text",
                "key": "param1",
                "label": "Parameter 1",
                "default": "value1"
            }
        ]
    });

    let create_req = Request::builder()
        .method("POST")
        .uri("/api/template")
        .header("content-type", "application/json")
        .body(Body::from(create_body.to_string()))
        .unwrap();

    let create_resp = app.clone().oneshot(create_req).await.unwrap();
    assert_eq!(create_resp.status(), StatusCode::CREATED);

    // Get template
    let get_req = Request::builder()
        .uri("/api/template/test-template")
        .body(Body::empty())
        .unwrap();

    let get_resp = app.clone().oneshot(get_req).await.unwrap();
    assert_eq!(get_resp.status(), StatusCode::OK);

    // Update template
    let update_body = serde_json::json!({
        "name": "test-template",
        "description": "Updated description",
        "category": "test",
        "prompt_template": "Updated prompt with {{param1}}",
        "options": [
            {
                "type": "text",
                "key": "param1",
                "label": "Parameter 1",
                "default": "value1"
            }
        ]
    });

    let update_req = Request::builder()
        .method("PUT")
        .uri("/api/template/test-template")
        .header("content-type", "application/json")
        .body(Body::from(update_body.to_string()))
        .unwrap();

    let update_resp = app.clone().oneshot(update_req).await.unwrap();
    assert_eq!(update_resp.status(), StatusCode::OK);

    // Delete template
    let delete_req = Request::builder()
        .method("DELETE")
        .uri("/api/template/test-template")
        .body(Body::empty())
        .unwrap();

    let delete_resp = app.clone().oneshot(delete_req).await.unwrap();
    assert_eq!(delete_resp.status(), StatusCode::OK);

    // Verify deleted
    let verify_req = Request::builder()
        .uri("/api/template/test-template")
        .body(Body::empty())
        .unwrap();

    let verify_resp = app.oneshot(verify_req).await.unwrap();
    assert_eq!(verify_resp.status(), StatusCode::NOT_FOUND);
}

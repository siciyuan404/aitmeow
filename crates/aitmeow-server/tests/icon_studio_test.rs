//! Icon Studio 服务端链路的端到端测试：设定 → 批量入库 → 集合 → 导入导出。

use aitmeow_core::config::Config;
use aitmeow_server::app_state::AppState;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use serde_json::{json, Value};
use tower::ServiceExt;

// 用 r##：内容里的 "#3B82F6" 含 `"#`，会提前终止 r#"..."#
const SRC: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#3B82F6"/></svg>"##;

async fn app() -> axum::Router {
    let config = Config::load_for_test();
    let state = AppState::new(&config).await.unwrap();
    aitmeow_server::http::create_router(state)
}

async fn post(app: &axum::Router, uri: &str, body: Value) -> (StatusCode, Value) {
    let req = Request::builder()
        .method("POST")
        .uri(uri)
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .unwrap();
    let resp = app.clone().oneshot(req).await.unwrap();
    let status = resp.status();
    let bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let json = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, json)
}

async fn get(app: &axum::Router, uri: &str) -> (StatusCode, Value) {
    let req = Request::builder()
        .method("GET")
        .uri(uri)
        .body(Body::empty())
        .unwrap();
    let resp = app.clone().oneshot(req).await.unwrap();
    let status = resp.status();
    let bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let json = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, json)
}

async fn delete(app: &axum::Router, uri: &str) -> (StatusCode, Value) {
    let req = Request::builder()
        .method("DELETE")
        .uri(uri)
        .body(Body::empty())
        .unwrap();
    let resp = app.clone().oneshot(req).await.unwrap();
    let status = resp.status();
    let bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    (status, serde_json::from_slice(&bytes).unwrap_or(Value::Null))
}

#[tokio::test]
async fn test_batch_save_applies_spec_and_groups_items() {
    let app = app().await;

    let (status, body) = post(
        &app,
        "/api/icon/batch",
        json!({
            "collection_name": "App 图标 第一批",
            "apply": true,
            "spec": {
                "shape": { "kind": "circle" },
                "base_size": 256,
                "background": { "kind": "solid", "color": "#F1F5F9" },
                "stroke": {
                    "kind": "line",
                    "color": "#0F172A",
                    "width": 0.05,
                    "dash": 0.08
                }
            },
            "items": [
                { "name": "icon-1", "svg_content": SRC, "tags": ["blue"] },
                { "name": "icon-2", "svg_content": SRC },
                { "name": "icon-3", "svg_content": SRC }
            ]
        }),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED, "body: {}", body);
    assert_eq!(body["saved"], 3);
    assert_eq!(body["failed"], json!([]));
    assert_eq!(body["collection"]["item_count"], 3);
    // 没给帧号，按批量集合处理
    assert_eq!(body["collection"]["kind"], "batch");

    let collection_id = body["collection"]["id"].as_str().unwrap().to_string();

    // 集合列表里要能看到条目数
    let (status, list) = get(&app, "/api/collections").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(list.as_array().unwrap().len(), 1);
    assert_eq!(list[0]["item_count"], 3);

    // 集合内条目：设定确实套上去了
    let (status, items) = get(
        &app,
        &format!("/api/collections/{}/items", collection_id),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(items["total"], 3);
    let first = &items["items"][0];
    assert_eq!(first["collection_id"], json!(collection_id));
    assert!(
        first["svg_content"]
            .as_str()
            .unwrap()
            .contains("aitmeow-shape"),
        "蒙版没套上: {}",
        first["svg_content"]
    );
    // 设定快照要留着，方便"同设定再来一次"
    assert!(first["preset"].is_object());
    assert_eq!(first["preset"]["shape"]["kind"], "circle");
}

#[tokio::test]
async fn test_batch_with_frame_index_becomes_frameset() {
    let app = app().await;

    let items: Vec<Value> = (0..4)
        .map(|i| {
            json!({
                "name": format!("frame-{}", i),
                "svg_content": SRC,
                "frame_index": i
            })
        })
        .collect();

    let (status, body) = post(
        &app,
        "/api/icon/batch",
        json!({
            "collection_name": "加载动画",
            "apply": false,
            "spec": { "shape": { "kind": "rounded_square" } },
            "items": items
        }),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED, "body: {}", body);
    assert_eq!(body["collection"]["kind"], "frameset");

    let id = body["collection"]["id"].as_str().unwrap();
    let (_, items) = get(&app, &format!("/api/collections/{}/items?sort_by=frame_index", id)).await;
    let frames: Vec<u32> = items["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|i| i["frame_index"].as_u64().unwrap() as u32)
        .collect();
    assert_eq!(frames, vec![0, 1, 2, 3]);
}

#[tokio::test]
async fn test_batch_rejects_invalid_spec() {
    let app = app().await;

    let (status, body) = post(
        &app,
        "/api/icon/batch",
        json!({
            "collection_name": "坏的",
            "spec": { "base_size": 1 },
            "items": [{ "name": "a", "svg_content": SRC }]
        }),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(body["error"].is_string());
}

#[tokio::test]
async fn test_batch_reports_per_item_failures() {
    let app = app().await;

    // 一条合法一条非法：非法的记进 failed，合法的照常入库
    let (status, body) = post(
        &app,
        "/api/icon/batch",
        json!({
            "collection_name": "混合批次",
            "apply": true,
            "spec": { "shape": { "kind": "square" } },
            "items": [
                { "name": "good", "svg_content": SRC },
                { "name": "bad", "svg_content": "<not-svg>" }
            ]
        }),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED, "body: {}", body);
    assert_eq!(body["saved"], 1);
    assert_eq!(body["failed"].as_array().unwrap().len(), 1);
}

#[tokio::test]
async fn test_delete_collection_unbinds_items() {
    let app = app().await;

    let (_, body) = post(
        &app,
        "/api/icon/batch",
        json!({
            "collection_name": "待删",
            "apply": false,
            "spec": {},
            "items": [{ "name": "keep-me", "svg_content": SRC }]
        }),
    )
    .await;
    let id = body["collection"]["id"].as_str().unwrap().to_string();

    let (status, _) = delete(&app, &format!("/api/collections/{}", id)).await;
    assert_eq!(status, StatusCode::OK);

    // 集合没了，条目还在，只是回到未归类
    let (status, list) = get(&app, "/api/collections").await;
    assert_eq!(status, StatusCode::OK);
    assert!(list.as_array().unwrap().is_empty());

    let (_, loose) = get(&app, "/api/svg?uncollected=true").await;
    assert_eq!(loose["total"], 1);
    assert_eq!(loose["items"][0]["name"], "keep-me");
    assert_eq!(loose["items"][0]["collection_id"], Value::Null);
}

#[tokio::test]
async fn test_export_import_roundtrip() {
    let app = app().await;

    post(
        &app,
        "/api/icon/batch",
        json!({
            "collection_name": "导出测试",
            "apply": false,
            "spec": { "shape": { "kind": "hexagon" }, "rotation": 30.0 },
            "items": [{ "name": "h1", "svg_content": SRC }]
        }),
    )
    .await;

    let (status, bundle) = get(&app, "/api/repository/export").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(bundle["version"], 1);
    assert_eq!(bundle["collections"].as_array().unwrap().len(), 1);
    assert_eq!(bundle["records"].as_array().unwrap().len(), 1);
    // 旋转角度要跟着走，这是"整库"的含义
    assert_eq!(bundle["collections"][0]["preset"]["rotation"], 30.0);

    let (status, report) = post(
        &app,
        "/api/repository/import",
        json!({ "bundle": bundle, "mode": "replace" }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "body: {}", report);
    assert_eq!(report["report"]["collections_added"], 1);
    assert_eq!(report["report"]["records_added"], 1);

    // replace 之后还是 1 条，没有重复
    let (_, list) = get(&app, "/api/svg").await;
    assert_eq!(list["total"], 1);
}

#[tokio::test]
async fn test_import_rejects_bad_version() {
    let app = app().await;
    let (_, mut bundle) = get(&app, "/api/repository/export").await;
    bundle["version"] = json!(999);

    let (status, body) = post(
        &app,
        "/api/repository/import",
        json!({ "bundle": bundle }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(body["error"].as_str().unwrap().contains("版本"));
}

#[tokio::test]
async fn test_record_type_filter_separates_assets_from_results() {
    let app = app().await;

    post(
        &app,
        "/api/svg",
        json!({
            "name": "成品", "svg_content": SRC, "record_type": "result"
        }),
    )
    .await;
    post(
        &app,
        "/api/svg",
        json!({
            "name": "素材", "svg_content": SRC, "record_type": "asset"
        }),
    )
    .await;

    let (_, all) = get(&app, "/api/svg").await;
    assert_eq!(all["total"], 2);

    let (_, assets) = get(&app, "/api/svg?record_type=asset").await;
    assert_eq!(assets["total"], 1);
    assert_eq!(assets["items"][0]["name"], "素材");

    let (_, results) = get(&app, "/api/svg?record_type=result").await;
    assert_eq!(results["total"], 1);
    assert_eq!(results["items"][0]["name"], "成品");
}

#[tokio::test]
async fn test_icon_apply_endpoint() {
    let app = app().await;

    let (status, body) = post(
        &app,
        "/api/icon/apply",
        json!({
            "svg": SRC,
            "spec": {
                "shape": { "kind": "circle" },
                "base_size": 128,
                "background": { "kind": "solid", "color": "#FFFFFF" }
            }
        }),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "body: {}", body);
    let svg = body["svg"].as_str().unwrap();
    assert!(svg.contains("viewBox=\"0 0 128 128\""));
    assert!(svg.contains("fill=\"#FFFFFF\""));
    assert!(svg.contains("aitmeow-shape"));
}

#[tokio::test]
async fn test_icon_apply_rejects_bad_spec() {
    let app = app().await;
    let (status, _) = post(
        &app,
        "/api/icon/apply",
        json!({ "svg": SRC, "spec": { "safe_area": 0.1 } }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_icon_prompt_endpoint() {
    let app = app().await;

    let (status, body) = post(
        &app,
        "/api/icon/prompt",
        json!({
            "user_prompt": "一只拿着电池的猫",
            "spec": {
                "shape": { "kind": "hexagon" },
                "rotation": 30.0,
                "safe_area": 0.8,
                "palette": { "mode": "monochrome" },
                "style": { "style": "line", "detail": "minimal" }
            },
            "refs": [
                { "name": "旧 logo", "hint": "只要配色" }
            ],
            "frame": [2, 8]
        }),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "body: {}", body);
    let prompt = body["prompt"].as_str().unwrap();
    assert!(prompt.contains("一只拿着电池的猫"));
    assert!(prompt.contains("正六边形"));
    assert!(prompt.contains("外框形状整体旋转 30°"));
    assert!(prompt.contains("收在画布中央约 80%"));
    assert!(prompt.contains("currentColor"));
    assert!(prompt.contains("线性风格"));
    assert!(prompt.contains("旧 logo：只要配色"));
    // 帧号指令只在动画开启且总帧数 >1 时出现
    assert!(!prompt.contains("帧循环动画"));
}

#[tokio::test]
async fn test_icon_prompt_rejects_empty_user_prompt() {
    let app = app().await;
    let (status, _) = post(
        &app,
        "/api/icon/prompt",
        json!({ "user_prompt": "   ", "spec": {} }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_references_crud() {
    let app = app().await;

    let (status, body) = post(
        &app,
        "/api/session/references/add",
        json!({ "name": "蜜蜂图标", "hint": "只要配色" }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "body: {}", body);
    assert_eq!(body["count"], 1);

    let (_, body) = get(&app, "/api/session/references").await;
    assert_eq!(body["items"].as_array().unwrap().len(), 1);

    // 同名追加应覆盖而不是堆积
    post(
        &app,
        "/api/session/references/add",
        json!({ "name": "蜜蜂图标", "hint": "只要构图" }),
    )
    .await;
    let (_, body) = get(&app, "/api/session/references").await;
    assert_eq!(body["items"].as_array().unwrap().len(), 1);
    assert_eq!(body["items"][0]["hint"], "只要构图");

    // 空名字要被拒
    let (status, _) = post(
        &app,
        "/api/session/references/add",
        json!({ "name": "   " }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let (status, _) = delete(&app, "/api/session/references").await;
    assert_eq!(status, StatusCode::OK);
    let (_, body) = get(&app, "/api/session/references").await;
    assert!(body["items"].as_array().unwrap().is_empty());
}

#[tokio::test]
async fn test_repository_info_reports_db_path() {
    let app = app().await;
    let (status, body) = get(&app, "/api/repository/info").await;
    assert_eq!(status, StatusCode::OK);
    // 测试配置下是 :memory:
    assert_eq!(body["db_path"], ":memory:");
    assert_eq!(body["record_count"], 0);
}

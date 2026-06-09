# P1b: aitmeow Server (MCP + HTTP + WebSocket)

## Git Branch
`p1b-server`

## Dependencies
`p0-core` branch completed

## Deliverables
- `crates/aitmeow-server/` service crate

## Cargo.toml Dependencies

```toml
[dependencies]
aitmeow-core = { path = "../aitmeow-core" }
axum = "0.8"
tokio = { version = "1", features = ["full"] }
tokio-tungstenite = "0.24"
rmcp = { version = "0.3", features = ["transport-streaming"] }
serde_json = "1"
tower-http = { version = "0.6", features = ["cors"] }
uuid = { version = "1", features = ["v4"] }
tracing = "0.1"
```

## Port Check Logic

```rust
/// Verify port is available before starting
/// Bind with 3 second timeout, return Err if occupied
async fn check_port(port: u16) -> Result<TcpListener> {
    TcpListener::bind(format!("127.0.0.1:{port}")).await
        .map_err(|_| AitmeowError::Config(format!("Port {port} is already in use")))
}
```

## Directory Structure

```
crates/aitmeow-server/src/
├── main.rs
├── app_state.rs
├── mcp.rs
├── http.rs
├── ws.rs
└── api/
    ├── mod.rs
    ├── svg.rs
    ├── repo.rs
    ├── template.rs
    └── health.rs
```

## Module Details

### `app_state.rs`
```rust
pub struct AppState {
    pub repository: Repository,
    pub template_registry: TemplateRegistry,
    pub rule_engine: RuleEngine,
    pub config: Config,
}
```

### `mcp.rs` — MCP Protocol (rmcp)

```rust
pub fn tools() -> Vec<Tool> {
    vec![
        Tool::new("svg_validate").description("Validate SVG syntax and rules")
            .input_schema(json!({...})),
        Tool::new("svg_render").description("Render SVG to PNG"),
        Tool::new("svg_save").description("Save SVG to repository"),
        Tool::new("svg_list").description("List SVGs in repository"),
        Tool::new("svg_search").description("Search SVG repository"),
        Tool::new("svg_delete").description("Delete SVG from repository"),
        Tool::new("template_list").description("List available templates"),
        Tool::new("template_get").description("Get template details"),
        Tool::new("server_health").description("Server health check"),
    ]
}

// Each tool handler calls the corresponding core function
// and returns JSON-RPC response
```

### `http.rs` — REST API Routes

```rust
pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/svg", get(list_svgs).post(save_svg))
        .route("/api/svg/:id", get(get_svg).put(update_svg).delete(delete_svg))
        .route("/api/svg/search", get(search_svgs))
        .route("/api/template", get(list_templates))
        .route("/api/template/:name", get(get_template))
        .route("/api/validate", post(validate))
        .route("/api/render", post(render))
        .route("/api/health", get(health))
        .route("/ws/preview", ws_handler)
        .with_state(state)
}
```

### `ws.rs` — WebSocket Live Push

```rust
/// Client connects, server pushes preview updates
/// Format: {"type":"preview","data":"data:image/png;base64,...","svg_id":"..."}
pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse;
```

### Server Entry Point

```rust
#[tokio::main]
async fn main() -> Result<()> {
    let config = Config::load();
    check_port(config.port).await?;
    let listener = TcpListener::bind(format!("127.0.0.1:{}", config.port)).await?;
    let state = AppState::new(&config).await?;
    let app = create_router(state);
    axum::serve(listener, app).await?;
    Ok(())
}
```

## Verification
- `cargo build` passes
- `curl localhost:8765/api/health` returns `{"status":"ok"}`
- MCP tools testable via Claude Code MCP inspector
- WebSocket testable via `websocat ws://localhost:8765/ws/preview`

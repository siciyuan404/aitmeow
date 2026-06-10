pub mod api;
pub mod app_state;
pub mod http;
pub mod mcp;
pub mod ws;

use tokio::net::TcpListener;

pub async fn start_server(config: aitmeow_core::config::Config) -> aitmeow_core::error::Result<()> {
    let port = config.port;

    let state = app_state::AppState::new(&config).await?;
    let app = http::create_router(state);

    let addr = format!("127.0.0.1:{}", port);
    let listener = TcpListener::bind(&addr).await?;

    println!("aitmeow server v{}", env!("CARGO_PKG_VERSION"));
    println!("Listening on http://{}", addr);
    println!("Health: http://{}/api/health", addr);
    println!("MCP: http://{}/mcp", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

pub async fn check_port(port: u16) -> aitmeow_core::error::Result<()> {
    let addr = format!("127.0.0.1:{}", port);
    TcpListener::bind(&addr).await.map_err(|_| {
        aitmeow_core::error::AitmeowError::Config(format!("Port {} is already in use", port))
    })?;
    Ok(())
}

mod api;
mod app_state;
mod http;
mod mcp;
mod ws;

use tokio::net::TcpListener;

#[tokio::main]
async fn main() -> aitmeow_core::error::Result<()> {
    let mut config = aitmeow_core::config::Config::load();

    let args: Vec<String> = std::env::args().collect();
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--port" => {
                if let Some(p) = args.get(i + 1).and_then(|v| v.parse().ok()) {
                    config.port = p;
                    i += 1;
                }
            }
            "--db" => {
                if let Some(p) = args.get(i + 1) {
                    config.db_path = std::path::PathBuf::from(p);
                    i += 1;
                }
            }
            "--memory" => {
                config.db_path = std::path::PathBuf::from(":memory:");
            }
            _ => {}
        }
        i += 1;
    }

    let port = config.port;
    check_port(port).await?;

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

async fn check_port(port: u16) -> aitmeow_core::error::Result<()> {
    let addr = format!("127.0.0.1:{}", port);
    TcpListener::bind(&addr).await.map_err(|_| {
        aitmeow_core::error::AitmeowError::Config(format!("Port {} is already in use", port))
    })?;
    Ok(())
}

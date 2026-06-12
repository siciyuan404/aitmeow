use std::path::PathBuf;

#[tokio::main]
async fn main() -> aitmeow_core::error::Result<()> {
    tracing_subscriber::fmt::init();
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
                    config.db_path = PathBuf::from(p);
                    i += 1;
                }
            }
            "--memory" => {
                config.db_path = PathBuf::from(":memory:");
            }
            "--template-dir" => {
                if let Some(p) = args.get(i + 1) {
                    config.template_dirs.push(PathBuf::from(p));
                    i += 1;
                }
            }
            _ => {}
        }
        i += 1;
    }

    aitmeow_server::check_port(config.port).await?;
    aitmeow_server::start_server(config).await
}

use crate::session::SessionState;
use aitmeow_core::config::Config;
use aitmeow_core::repository::Repository;
use aitmeow_core::rule::RuleEngine;
use aitmeow_core::template::TemplateRegistry;
use std::sync::atomic::AtomicUsize;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct AppState {
    pub repository: Arc<Repository>,
    pub template_registry: Arc<RwLock<TemplateRegistry>>,
    pub rule_engine: Arc<RuleEngine>,
    pub config: Arc<Config>,
    pub session: Arc<RwLock<SessionState>>,
    /// 当前连接的 WebSocket（桌面预览端）数量 —— MCP 用它判断推送有没有人接收
    pub ws_connections: Arc<AtomicUsize>,
}

impl AppState {
    pub async fn new(config: &Config) -> aitmeow_core::error::Result<Self> {
        let repository = Repository::open(&config.db_path).await?;
        let mut template_registry = TemplateRegistry::new();

        for dir in &config.template_dirs {
            if dir.exists() {
                let templates = TemplateRegistry::load_from_dir(dir).await?;
                template_registry.register(templates);
            }
        }

        let rule_engine = RuleEngine::default_rules();

        Ok(Self {
            repository: Arc::new(repository),
            template_registry: Arc::new(RwLock::new(template_registry)),
            rule_engine: Arc::new(rule_engine),
            config: Arc::new(config.clone()),
            session: Arc::new(RwLock::new(SessionState::new())),
            ws_connections: Arc::new(AtomicUsize::new(0)),
        })
    }
}

use aitmeow_core::config::Config;
use aitmeow_core::repository::Repository;
use aitmeow_core::rule::RuleEngine;
use aitmeow_core::template::TemplateRegistry;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub repository: Arc<Repository>,
    pub template_registry: Arc<TemplateRegistry>,
    pub rule_engine: Arc<RuleEngine>,
    pub config: Arc<Config>,
}

impl AppState {
    pub async fn new(config: &Config) -> aitmeow_core::error::Result<Self> {
        let repository = Repository::open(&config.db_path).await?;
        let mut template_registry = TemplateRegistry::new();

        for dir in &config.template_dirs {
            if dir.exists() {
                let templates = TemplateRegistry::load_from_dir(dir)?;
                template_registry.register(templates);
            }
        }

        let rule_engine = RuleEngine::default_rules();

        Ok(Self {
            repository: Arc::new(repository),
            template_registry: Arc::new(template_registry),
            rule_engine: Arc::new(rule_engine),
            config: Arc::new(config.clone()),
        })
    }
}

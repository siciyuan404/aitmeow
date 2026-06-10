use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct Config {
    pub port: u16,
    pub db_path: PathBuf,
    pub template_dirs: Vec<PathBuf>,
    pub max_svg_size: usize,
    pub log_level: String,
}

impl Config {
pub fn load() -> Self {
    let home = dirs_next().unwrap_or_else(|| PathBuf::from("."));
    let data_dir = home.join(".aitmeow");

    Self {
        port: 8765,
        db_path: data_dir.join("aitmeow.db"),
        template_dirs: vec![data_dir.join("templates")],
        max_svg_size: 102_400,
        log_level: "info".to_string(),
    }
}

pub fn load_for_test() -> Self {
    Self {
        port: 0,
        db_path: PathBuf::from(":memory:"),
        template_dirs: vec![],
        max_svg_size: 102_400,
        log_level: "debug".to_string(),
    }
}

    pub fn with_port(mut self, port: u16) -> Self {
        self.port = port;
        self
    }

    pub fn with_db_path(mut self, path: PathBuf) -> Self {
        self.db_path = path;
        self
    }
}

fn dirs_next() -> Option<PathBuf> {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok()
        .map(PathBuf::from)
}

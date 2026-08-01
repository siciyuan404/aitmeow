use thiserror::Error;

#[derive(Debug, Error)]
pub enum AitmeowError {
    #[error("SVG parse error: {0}")]
    SvgParse(String),

    #[error("Validation failed: {0}")]
    Validation(String),

    #[error("Render error: {0}")]
    Render(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Config error: {0}")]
    Config(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Template error: {0}")]
    Template(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Serialization error: {0}")]
    Serialize(String),
}

pub type Result<T> = std::result::Result<T, AitmeowError>;

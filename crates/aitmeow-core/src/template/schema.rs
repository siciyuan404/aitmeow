use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum TemplateOption {
    Color {
        key: String,
        label: String,
        #[serde(default)]
        default: String,
    },
    Select {
        key: String,
        label: String,
        options: Vec<String>,
        #[serde(default)]
        default: String,
    },
    Text {
        key: String,
        label: String,
        #[serde(default)]
        default: String,
        #[serde(default)]
        placeholder: String,
    },
    Range {
        key: String,
        label: String,
        #[serde(default = "default_min")]
        min: f64,
        #[serde(default = "default_max")]
        max: f64,
        #[serde(default = "default_value")]
        default: f64,
        #[serde(default = "default_step")]
        step: f64,
    },
}

fn default_min() -> f64 {
    0.0
}
fn default_max() -> f64 {
    100.0
}
fn default_value() -> f64 {
    50.0
}
fn default_step() -> f64 {
    1.0
}

impl TemplateOption {
    pub fn key(&self) -> &str {
        match self {
            TemplateOption::Color { key, .. }
            | TemplateOption::Select { key, .. }
            | TemplateOption::Text { key, .. }
            | TemplateOption::Range { key, .. } => key,
        }
    }

    pub fn label(&self) -> &str {
        match self {
            TemplateOption::Color { label, .. }
            | TemplateOption::Select { label, .. }
            | TemplateOption::Text { label, .. }
            | TemplateOption::Range { label, .. } => label,
        }
    }

    pub fn default_value(&self) -> String {
        match self {
            TemplateOption::Color { default, .. }
            | TemplateOption::Select { default, .. }
            | TemplateOption::Text { default, .. } => default.clone(),
            TemplateOption::Range { default, .. } => default.to_string(),
        }
    }
}

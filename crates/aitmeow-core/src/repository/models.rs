use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SvgRecord {
    pub id: String,
    pub name: String,
    pub svg_content: String,
    pub template_name: Option<String>,
    pub tags: Vec<String>,
    pub params: HashMap<String, String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub thumbnail: Option<Vec<u8>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl SvgRecord {
    pub fn new(name: String, svg_content: String) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            svg_content,
            template_name: None,
            tags: Vec::new(),
            params: HashMap::new(),
            width: None,
            height: None,
            thumbnail: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn with_template(mut self, name: impl Into<String>) -> Self {
        self.template_name = Some(name.into());
        self
    }

    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }

    pub fn with_params(mut self, params: HashMap<String, String>) -> Self {
        self.params = params;
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListOptions {
    pub offset: u32,
    pub limit: u32,
    pub sort_by: String,
    pub sort_order: String,
    pub tag: Option<String>,
    pub category: Option<String>,
}

impl Default for ListOptions {
    fn default() -> Self {
        Self {
            offset: 0,
            limit: 20,
            sort_by: "created_at".to_string(),
            sort_order: "desc".to_string(),
            tag: None,
            category: None,
        }
    }
}

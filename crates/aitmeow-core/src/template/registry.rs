use crate::error::{AitmeowError, Result};
use crate::template::TemplateOption;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Template {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_category")]
    pub category: String,
    #[serde(default)]
    pub reference: Option<String>,
    #[serde(default)]
    pub prompt_template: String,
    #[serde(default)]
    pub options: Vec<TemplateOption>,
    #[serde(default)]
    pub validation: TemplateValidation,
    #[serde(skip)]
    pub source_path: PathBuf,
}

fn default_category() -> String {
    "general".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TemplateValidation {
    #[serde(default)]
    pub rules: Vec<String>,
    #[serde(default)]
    pub retry_on_fail: u32,
}

#[derive(Debug, Clone)]
pub struct TemplateRegistry {
    templates: Vec<Template>,
}

impl TemplateRegistry {
    pub fn new() -> Self {
        Self {
            templates: Vec::new(),
        }
    }

    pub fn load_from_dir(path: &Path) -> Result<Vec<Template>> {
        let mut templates = Vec::new();

        if !path.exists() {
            return Ok(templates);
        }

        let pattern = path.join("*.toml");
        let pattern_str = pattern.to_string_lossy();

        for entry in glob::glob(&pattern_str).map_err(|e| AitmeowError::Template(e.to_string()))? {
            let entry = entry.map_err(|e| AitmeowError::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                e.to_string(),
            )))?;

            let content =
                std::fs::read_to_string(&entry).map_err(|e| AitmeowError::Template(format!(
                    "Failed to read {}: {}",
                    entry.display(),
                    e
                )))?;

            let mut template: Template =
                toml::from_str(&content).map_err(|e| AitmeowError::Template(format!(
                    "Failed to parse {}: {}",
                    entry.display(),
                    e
                )))?;

            template.source_path = entry.clone();
            templates.push(template);
        }

        Ok(templates)
    }

    pub fn register(&mut self, templates: Vec<Template>) {
        self.templates.extend(templates);
    }

    pub fn list(&self) -> &[Template] {
        &self.templates
    }

    pub fn get(&self, name: &str) -> Option<&Template> {
        self.templates.iter().find(|t| t.name == name)
    }

    pub fn categories(&self) -> Vec<String> {
        let mut cats: Vec<String> = self
            .templates
            .iter()
            .map(|t| t.category.clone())
            .collect();
        cats.sort();
        cats.dedup();
        cats
    }

    pub fn search(&self, query: &str) -> Vec<&Template> {
        let q = query.to_lowercase();
        self.templates
            .iter()
            .filter(|t| {
                t.name.to_lowercase().contains(&q)
                    || t.description.to_lowercase().contains(&q)
                    || t.category.to_lowercase().contains(&q)
            })
            .collect()
    }
}

pub fn compile_prompt(
    tmpl: &Template,
    params: &HashMap<String, String>,
) -> Result<String> {
    let mut prompt = tmpl.prompt_template.clone();

    for (key, value) in params {
        let placeholder = format!("{{{{{}}}}}", key);
        prompt = prompt.replace(&placeholder, value);
    }

    if prompt.contains("{{") {
        return Err(AitmeowError::Template(
            "Unresolved template variables remaining".to_string(),
        ));
    }

    Ok(prompt)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compile_prompt() {
        let tmpl = Template {
            name: "test".into(),
            description: "".into(),
            category: "test".into(),
            reference: None,
            prompt_template: "Color: {{color}}, Size: {{size}}".into(),
            options: vec![],
            validation: Default::default(),
            source_path: PathBuf::new(),
        };

        let mut params = HashMap::new();
        params.insert("color".into(), "blue".into());
        params.insert("size".into(), "100".into());

        let result = compile_prompt(&tmpl, &params).unwrap();
        assert_eq!(result, "Color: blue, Size: 100");
    }

    #[test]
    fn test_compile_missing_var() {
        let tmpl = Template {
            name: "test".into(),
            description: "".into(),
            category: "test".into(),
            reference: None,
            prompt_template: "Color: {{color}}".into(),
            options: vec![],
            validation: Default::default(),
            source_path: PathBuf::new(),
        };

        let params = HashMap::new();
        assert!(compile_prompt(&tmpl, &params).is_err());
    }
}

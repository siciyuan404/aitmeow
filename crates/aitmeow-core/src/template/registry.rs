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

    pub async fn load_from_dir(path: &Path) -> Result<Vec<Template>> {
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
                tokio::fs::read_to_string(&entry).await.map_err(|e| AitmeowError::Template(format!(
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

    /// Create a new template and persist to disk
    pub async fn create(&mut self, template_dir: &Path, template: Template) -> Result<()> {
        // 1. Validate template
        validate_template(&template)?;

        // 2. Validate directory exists
        if !template_dir.exists() {
            return Err(AitmeowError::Template(format!(
                "Template directory does not exist: {}",
                template_dir.display()
            )));
        }
        if !template_dir.is_dir() {
            return Err(AitmeowError::Template(format!(
                "Template path is not a directory: {}",
                template_dir.display()
            )));
        }

        // 3. Check for duplicate name
        if self.get(&template.name).is_some() {
            return Err(AitmeowError::Template(format!(
                "Template '{}' already exists",
                template.name
            )));
        }

        // 4. Sanitize filename
        let filename = sanitize_filename(&template.name);
        let file_path = template_dir.join(format!("{}.toml", filename));

        // 5. Check if sanitized filename already exists
        if file_path.exists() {
            return Err(AitmeowError::Template(format!(
                "Template filename '{}' conflicts with existing file",
                filename
            )));
        }

        // 6. Serialize to TOML
        let toml_str = toml::to_string_pretty(&template)
            .map_err(|e| AitmeowError::Template(format!("Failed to serialize: {}", e)))?;

        // 7. Add to registry FIRST (for transactional behavior)
        let mut tmpl_with_path = template;
        tmpl_with_path.source_path = file_path.clone();
        self.templates.push(tmpl_with_path);

        // 8. Write to file - if this fails, rollback
        if let Err(e) = tokio::fs::write(&file_path, toml_str).await {
            self.templates.pop(); // Rollback
            return Err(AitmeowError::Io(e));
        }

        Ok(())
    }

    /// Update an existing template
    pub async fn update(&mut self, _template_dir: &Path, template: Template) -> Result<()> {
        // 1. Validate template
        validate_template(&template)?;

        // 2. Find existing template
        let idx = self.templates.iter().position(|t| t.name == template.name)
            .ok_or_else(|| AitmeowError::Template(format!(
                "Template '{}' not found",
                template.name
            )))?;

        let old_path = self.templates[idx].source_path.clone();

        // 3. Validate path still exists
        if !old_path.exists() {
            return Err(AitmeowError::Template(format!(
                "Template file was deleted: {}",
                old_path.display()
            )));
        }

        // 4. Serialize to TOML
        let toml_str = toml::to_string_pretty(&template)
            .map_err(|e| AitmeowError::Template(format!("Failed to serialize: {}", e)))?;

        // 5. Write to file
        tokio::fs::write(&old_path, toml_str)
            .await
            .map_err(|e| AitmeowError::Io(e))?;

        // 6. Update in registry
        self.templates[idx] = template;
        self.templates[idx].source_path = old_path;

        Ok(())
    }

    /// Delete a template from registry and disk
    pub async fn delete(&mut self, name: &str) -> Result<()> {
        let idx = self.templates.iter().position(|t| t.name == name)
            .ok_or_else(|| AitmeowError::Template(format!(
                "Template '{}' not found",
                name
            )))?;

        let path = self.templates[idx].source_path.clone();

        // Remove from disk
        if path.exists() {
            tokio::fs::remove_file(&path)
                .await
                .map_err(|e| AitmeowError::Io(e))?;
        }

        // Remove from registry
        self.templates.remove(idx);

        Ok(())
    }
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_' => c,
            ' ' => '-',
            _ => '_',
        })
        .collect::<String>()
        .to_lowercase()
}

/// Validate template before create/update
pub fn validate_template(tmpl: &Template) -> Result<()> {
    // Name validation
    if tmpl.name.trim().is_empty() {
        return Err(AitmeowError::Template("Template name cannot be empty".into()));
    }

    if tmpl.name.len() > 64 {
        return Err(AitmeowError::Template("Template name too long (max 64 chars)".into()));
    }

    // Check for invalid characters in name
    if !tmpl.name.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_' || c == ' ') {
        return Err(AitmeowError::Template(
            "Template name can only contain alphanumeric, dash, underscore, and space".into()
        ));
    }

    // Prompt template validation
    if tmpl.prompt_template.trim().is_empty() {
        return Err(AitmeowError::Template("Prompt template cannot be empty".into()));
    }

    // Options validation - check for duplicate keys
    let mut keys = std::collections::HashSet::new();
    for opt in &tmpl.options {
        let key = opt.key();
        if !keys.insert(key) {
            return Err(AitmeowError::Template(format!(
                "Duplicate option key: {}",
                key
            )));
        }
    }

    Ok(())
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

    #[tokio::test]
    async fn test_create_template() {
        let temp_dir = tempfile::tempdir().unwrap();
        let mut registry = TemplateRegistry::new();

        let tmpl = Template {
            name: "test-template".into(),
            description: "Test template".into(),
            category: "test".into(),
            reference: None,
            prompt_template: "Test prompt".into(),
            options: vec![],
            validation: Default::default(),
            source_path: temp_dir.path().join("test-template.toml"),
        };

        let result = registry.create(temp_dir.path(), tmpl.clone()).await;
        assert!(result.is_ok());
        assert_eq!(registry.list().len(), 1);
        assert!(temp_dir.path().join("test-template.toml").exists());
    }

    #[tokio::test]
    async fn test_update_template() {
        let temp_dir = tempfile::tempdir().unwrap();
        let mut registry = TemplateRegistry::new();

        let tmpl = Template {
            name: "test".into(),
            description: "Original".into(),
            category: "test".into(),
            reference: None,
            prompt_template: "Prompt".into(),
            options: vec![],
            validation: Default::default(),
            source_path: temp_dir.path().join("test.toml"),
        };

        registry.create(temp_dir.path(), tmpl.clone()).await.unwrap();

        let mut updated = tmpl.clone();
        updated.description = "Updated".into();

        let result = registry.update(temp_dir.path(), updated).await;
        assert!(result.is_ok());
        assert_eq!(registry.get("test").unwrap().description, "Updated");
    }

    #[tokio::test]
    async fn test_delete_template() {
        let temp_dir = tempfile::tempdir().unwrap();
        let mut registry = TemplateRegistry::new();

        let tmpl = Template {
            name: "test".into(),
            description: "Test".into(),
            category: "test".into(),
            reference: None,
            prompt_template: "Prompt".into(),
            options: vec![],
            validation: Default::default(),
            source_path: temp_dir.path().join("test.toml"),
        };

        registry.create(temp_dir.path(), tmpl).await.unwrap();
        assert_eq!(registry.list().len(), 1);

        let result = registry.delete("test").await;
        assert!(result.is_ok());
        assert_eq!(registry.list().len(), 0);
        assert!(!temp_dir.path().join("test.toml").exists());
    }

    #[test]
    fn test_validate_template() {
        let tmpl = Template {
            name: "".into(),
            description: "Test".into(),
            category: "test".into(),
            reference: None,
            prompt_template: "{{color}}".into(),
            options: vec![],
            validation: Default::default(),
            source_path: PathBuf::new(),
        };

        let result = validate_template(&tmpl);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("name cannot be empty"));
    }

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

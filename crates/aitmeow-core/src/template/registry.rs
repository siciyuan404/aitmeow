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

impl Template {
    /// Inject reference image data into all [`TemplateOption::ImageReference`] options.
    ///
    /// Call this before [`compile_prompt`] if the user has uploaded a reference image.
    /// The image data will be processed by the pipeline during option rendering.
    pub fn inject_reference_image(&mut self, image_data: Vec<u8>) {
        for option in &mut self.options {
            if let TemplateOption::ImageReference { image_data: ref mut img, .. } = option {
                *img = Some(image_data.clone());
            }
        }
    }
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

    /// Create a new template and persist to disk
    pub async fn create(&mut self, template_dir: &Path, template: Template) -> Result<()> {
        validate_template(&template)?;

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

        if self.get(&template.name).is_some() {
            return Err(AitmeowError::Template(format!(
                "Template '{}' already exists",
                template.name
            )));
        }

        let filename = sanitize_filename(&template.name);
        let file_path = template_dir.join(format!("{}.toml", filename));

        if file_path.exists() {
            return Err(AitmeowError::Template(format!(
                "Template filename '{}' conflicts with existing file",
                filename
            )));
        }

        let toml_str = toml::to_string_pretty(&template)
            .map_err(|e| AitmeowError::Template(format!("Failed to serialize: {}", e)))?;

        let mut tmpl_with_path = template;
        tmpl_with_path.source_path = file_path.clone();
        self.templates.push(tmpl_with_path);

        if let Err(e) = tokio::fs::write(&file_path, toml_str).await {
            self.templates.pop();
            return Err(AitmeowError::Io(e));
        }

        Ok(())
    }

    pub async fn update(&mut self, _template_dir: &Path, template: Template) -> Result<()> {
        validate_template(&template)?;

        let idx = self.templates.iter().position(|t| t.name == template.name)
            .ok_or_else(|| AitmeowError::Template(format!(
                "Template '{}' not found",
                template.name
            )))?;

        let old_path = self.templates[idx].source_path.clone();

        if !old_path.exists() {
            return Err(AitmeowError::Template(format!(
                "Template file was deleted: {}",
                old_path.display()
            )));
        }

        let toml_str = toml::to_string_pretty(&template)
            .map_err(|e| AitmeowError::Template(format!("Failed to serialize: {}", e)))?;

        tokio::fs::write(&old_path, toml_str)
            .await
            .map_err(|e| AitmeowError::Io(e))?;

        self.templates[idx] = template;
        self.templates[idx].source_path = old_path;

        Ok(())
    }

    pub async fn delete(&mut self, name: &str) -> Result<()> {
        let idx = self.templates.iter().position(|t| t.name == name)
            .ok_or_else(|| AitmeowError::Template(format!(
                "Template '{}' not found",
                name
            )))?;

        let path = self.templates[idx].source_path.clone();

        if path.exists() {
            tokio::fs::remove_file(&path)
                .await
                .map_err(|e| AitmeowError::Io(e))?;
        }

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

pub fn validate_template(tmpl: &Template) -> Result<()> {
    if tmpl.name.trim().is_empty() {
        return Err(AitmeowError::Template("Template name cannot be empty".into()));
    }
    if tmpl.name.len() > 64 {
        return Err(AitmeowError::Template("Template name too long (max 64 chars)".into()));
    }
    if !tmpl.name.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_' || c == ' ') {
        return Err(AitmeowError::Template(
            "Template name can only contain alphanumeric, dash, underscore, and space".into()
        ));
    }
    if tmpl.prompt_template.trim().is_empty() {
        return Err(AitmeowError::Template("Prompt template cannot be empty".into()));
    }

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

/// Compile a template prompt by substituting `{{key}}` placeholders with values.
///
/// Uses type-aware rendering via [`TemplateOption::render_for_prompt`] for
/// pixel art types that inject SVG rendering hints into the prompt.
/// Falls back to plain value substitution for options without a matching type.
pub fn compile_prompt(
    tmpl: &Template,
    params: &HashMap<String, String>,
) -> Result<String> {
    let mut prompt = tmpl.prompt_template.clone();

    for (key, value) in params {
        let rendered = if let Some(option) = tmpl.options.iter().find(|o| o.key() == key) {
            option.render_for_prompt(value)
        } else {
            value.clone()
        };
        let placeholder = format!("{{{{{}}}}}", key);
        prompt = prompt.replace(&placeholder, &rendered);
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
    use crate::template::TemplateOption;

    #[test]
    fn test_inject_reference_image() {
        let mut tmpl = Template {
            name: "ref-test".into(),
            description: "".into(),
            category: "test".into(),
            reference: None,
            prompt_template: "Ref: {{img}}".into(),
            options: vec![
                TemplateOption::ImageReference {
                    key: "img".into(),
                    label: "Image".into(),
                    resize: Some("32x32".into()),
                    edge_detect: None,
                    quantize_colors: None,
                    threshold: None,
                    invert: false,
                    image_data: None,
                },
            ],
            validation: Default::default(),
            source_path: PathBuf::new(),
        };

        assert!(tmpl.options[0].default_value().is_empty());

        let fake_png = vec![0x89, b'P', b'N', b'G', 0, 0, 0, 0];
        tmpl.inject_reference_image(fake_png);

        // After injection, the ImageReference should have image_data
        match &tmpl.options[0] {
            TemplateOption::ImageReference { image_data, .. } => {
                assert!(image_data.is_some());
            }
            _ => panic!("Expected ImageReference"),
        }
    }

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
    fn test_compile_prompt_plain() {
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

    #[test]
    fn test_compile_type_aware_pixel_grid() {
        let tmpl = Template {
            name: "pixel-test".into(),
            description: "".into(),
            category: "pixel".into(),
            reference: None,
            prompt_template: "Canvas: {{grid}}".into(),
            options: vec![
                TemplateOption::PixelGrid {
                    key: "grid".into(),
                    label: "Grid".into(),
                    presets: vec![],
                    allow_custom: true,
                    default: "32x32".into(),
                },
            ],
            validation: Default::default(),
            source_path: PathBuf::new(),
        };

        let mut params = HashMap::new();
        params.insert("grid".into(), "32x32".into());

        let result = compile_prompt(&tmpl, &params).unwrap();
        assert!(result.contains("32×32"));
        assert!(result.contains("crispEdges"));
        assert!(result.contains("viewBox"));
    }

    #[test]
    fn test_compile_type_aware_palette() {
        let tmpl = Template {
            name: "pal-test".into(),
            description: "".into(),
            category: "pixel".into(),
            reference: None,
            prompt_template: "Palette: {{pal}}".into(),
            options: vec![
                TemplateOption::PixelPalette {
                    key: "pal".into(),
                    label: "Palette".into(),
                    preset: "gameboy".into(),
                    colors: vec![],
                    default: "gameboy".into(),
                },
            ],
            validation: Default::default(),
            source_path: PathBuf::new(),
        };

        let mut params = HashMap::new();
        params.insert("pal".into(), "gameboy".into());

        let result = compile_prompt(&tmpl, &params).unwrap();
        assert!(result.contains("4 colors"));
        assert!(result.contains("#0f380f"));
        assert!(result.contains("gameboy"));
    }

    #[test]
    fn test_compile_type_aware_random_seed() {
        let tmpl = Template {
            name: "rand-test".into(),
            description: "".into(),
            category: "pixel".into(),
            reference: None,
            prompt_template: "Random: {{seed}}".into(),
            options: vec![
                TemplateOption::RandomSeed {
                    key: "seed".into(),
                    label: "Seed".into(),
                    seed: Some(42),
                    strength: 0.5,
                },
            ],
            validation: Default::default(),
            source_path: PathBuf::new(),
        };

        let mut params = HashMap::new();
        params.insert("seed".into(), "42".into());

        let result = compile_prompt(&tmpl, &params).unwrap();
        assert!(result.contains("seed=42"));
        assert!(result.contains("reproducible"));
    }
}

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
        // Use type-aware rendering if the option exists in the template
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
        // Should contain rich pixel-grid hints from render_for_prompt
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
        // Should contain Gameboy palette hints from render_for_prompt
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

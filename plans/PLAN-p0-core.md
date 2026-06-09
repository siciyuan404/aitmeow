# P0: aitmeow Core Library

## Git Branch
`p0-core`

## Dependencies
None (base layer, all other branches depend on this)

## Deliverables
- Rust workspace `aitmeow/`
- `crates/aitmeow-core/` library crate

## Cargo.toml Dependencies

```toml
[dependencies]
usvg = "0.44"
resvg = "0.44"
tiny-skia = "0.11"
sqlx = { version = "0.8", features = ["sqlite", "runtime-tokio", "chrono"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
toml = "0.8"
svgtypes = "0.15"
thiserror = "2"
tracing = "0.1"
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
glob = "0.3"
tokio = { version = "1", features = ["full"] }
```

## Directory Structure

```
crates/aitmeow-core/src/
├── lib.rs
├── svg/
│   ├── mod.rs
│   ├── validate.rs
│   ├── render.rs
│   └── sanitize.rs
├── template/
│   ├── mod.rs
│   ├── registry.rs
│   ├── schema.rs
│   └── compiler.rs
├── rule/
│   ├── mod.rs
│   ├── engine.rs
│   └── builtin.rs
├── repository/
│   ├── mod.rs
│   ├── models.rs
│   └── db.rs
├── config.rs
└── error.rs
```

## Module Details

### `svg/validate.rs`

```rust
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<String>,
}

pub struct ValidationError {
    pub line: usize,
    pub column: usize,
    pub message: String,
    pub code: String,
}

pub fn validate_svg(input: &str, rules: &[Rule]) -> Result<ValidationResult>;
```

Steps:
1. `usvg::Tree::from_str` parsing → syntax check
2. `sanitize::sanitize` security cleaning
3. Custom rules checked one by one
4. Return `ValidationResult`

### `svg/render.rs`

```rust
pub struct RenderOptions {
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub background_color: Option<String>,
    pub format: OutputFormat,
}

pub enum OutputFormat { Png, Svg }

pub fn render_svg(input: &str, opts: &RenderOptions) -> Result<Vec<u8>>;
```

### `svg/sanitize.rs`

```rust
/// Filter dangerous elements and attributes: script, foreignObject, event handlers (onclick etc.)
pub fn sanitize(input: &str) -> Result<String>;
```

### `template/`

```rust
pub struct Template {
    pub name: String,
    pub description: String,
    pub category: String,
    pub reference: Option<String>,
    pub prompt_template: String,
    pub options: Vec<TemplateOption>,
    pub validation: TemplateValidation,
    pub source_path: PathBuf,
}

pub enum TemplateOption {
    Color { key: String, label: String, default: String },
    Select { key: String, label: String, options: Vec<String>, default: String },
    Text { key: String, label: String, default: String, placeholder: String },
    Range { key: String, label: String, min: f64, max: f64, default: f64, step: f64 },
}

pub struct TemplateValidation {
    pub rules: Vec<String>,
    pub retry_on_fail: u32,
}

pub struct TemplateRegistry {
    pub fn load_from_dir(path: &Path) -> Result<Vec<Template>>;
    pub fn compile_prompt(tmpl: &Template, params: &HashMap<String, String>) -> Result<String>;
}
```

### `rule/`

```rust
pub enum Rule {
    MaxSize(usize),
    CheckViewBox(bool),
    RequireIds(bool),
    ColorPalette(Vec<String>),
    Custom { name: String, pattern: String },
}

pub struct RuleEngine {
    rules: Vec<Rule>,
}

impl RuleEngine {
    pub fn new(rules: Vec<Rule>) -> Self;
    pub fn from_config(config: &[toml::Value]) -> Result<Self>;
    pub fn validate(&self, svg: &str) -> Result<ValidationResult>;
}
```

### `repository/models.rs`

```rust
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
```

### `repository/db.rs`

```rust
pub struct Repository {
    pool: SqlitePool,
}

impl Repository {
    pub async fn open(path: &Path) -> Result<Self>;
    pub async fn migrate(&self) -> Result<()>;
    pub async fn save(&self, record: &SvgRecord) -> Result<()>;
    pub async fn list(&self, opts: &ListOptions) -> Result<Vec<SvgRecord>>;
    pub async fn get(&self, id: &str) -> Result<Option<SvgRecord>>;
    pub async fn search(&self, query: &str, tags: &[String]) -> Result<Vec<SvgRecord>>;
    pub async fn delete(&self, id: &str) -> Result<bool>;
}
```

### `config.rs`

```rust
pub struct Config {
    pub port: u16,
    pub db_path: PathBuf,
    pub template_dirs: Vec<PathBuf>,
    pub max_svg_size: usize,
    pub log_level: String,
}

impl Config {
    pub fn load() -> Self;
}
```

### `error.rs`

```rust
#[derive(Debug, thiserror::Error)]
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
}
```

## Stable pub interface (for P1a/P1b)

All `pub fn` signatures are frozen when P0 completes. Generate API docs with `cargo doc --no-deps`.

## Verification
- `cargo build` passes
- `cargo test` covers:
  - validate: valid SVG passes / invalid SVG errors / XSS injection blocked
  - render: basic SVG renders correct PNG
  - rule engine: each rule tested individually
  - repository: full CRUD path
  - template: directory loading / prompt compilation / option serialization

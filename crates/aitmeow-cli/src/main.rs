use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "aitmeow", version, about = "SVG tool service — MCP server for AI agents")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    #[command(about = "Start the aitmeow server")]
    Start {
        #[arg(short, long, default_value = "8765")]
        port: u16,
        #[arg(long)]
        db: Option<String>,
        #[arg(long)]
        memory: bool,
    },

    #[command(about = "Validate an SVG file")]
    Validate {
        #[arg(value_name = "FILE")]
        path: PathBuf,
        #[arg(short, long, num_args = 1..)]
        rules: Option<Vec<String>>,
    },

    #[command(about = "Render SVG to PNG")]
    Render {
        #[arg(value_name = "FILE")]
        path: PathBuf,
        #[arg(short = 'o', long)]
        output: Option<PathBuf>,
        #[arg(short = 'w', long)]
        width: Option<u32>,
        #[arg(short = 'H', long)]
        height: Option<u32>,
        #[arg(short = 'b', long)]
        background: Option<String>,
    },

    #[command(about = "SVG repository operations")]
    Repo {
        #[command(subcommand)]
        action: RepoAction,
    },

    #[command(about = "Template operations")]
    Template {
        #[command(subcommand)]
        action: TemplateAction,
    },

    #[command(about = "Health check")]
    Health,
}

#[derive(Subcommand)]
enum RepoAction {
    #[command(about = "List SVGs in repository")]
    List {
        #[arg(short, long)]
        tag: Option<String>,
        #[arg(short = 'n', long, default_value = "20")]
        limit: u32,
    },
    #[command(about = "Get SVG details by ID")]
    Get {
        #[arg(value_name = "ID")]
        id: String,
    },
    #[command(about = "Save an SVG file to repository")]
    Save {
        #[arg(value_name = "FILE")]
        path: PathBuf,
        #[arg(short, long)]
        name: Option<String>,
        #[arg(short, long)]
        tag: Vec<String>,
        #[arg(short = 'T', long)]
        template: Option<String>,
    },
    #[command(about = "Search repository")]
    Search {
        #[arg(value_name = "QUERY")]
        query: Option<String>,
        #[arg(short, long)]
        tags: Vec<String>,
    },
    #[command(about = "Delete SVG from repository")]
    Delete {
        #[arg(value_name = "ID")]
        id: String,
    },
}

#[derive(Subcommand)]
enum TemplateAction {
    #[command(about = "List available templates")]
    List {
        #[arg(short, long)]
        category: Option<String>,
    },
    #[command(about = "Get template details")]
    Get {
        #[arg(value_name = "NAME")]
        name: String,
    },
}

#[tokio::main]
async fn main() -> aitmeow_core::error::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Start { port, db, memory } => cmd_start(port, db, memory).await,
        Commands::Validate { path, rules } => cmd_validate(path, rules).await,
        Commands::Render { path, output, width, height, background } => {
            cmd_render(path, output, width, height, background).await
        }
        Commands::Repo { action } => match action {
            RepoAction::List { tag, limit } => cmd_repo_list(tag, limit).await,
            RepoAction::Get { id } => cmd_repo_get(id).await,
            RepoAction::Save { path, name, tag, template } => cmd_repo_save(path, name, tag, template).await,
            RepoAction::Search { query, tags } => cmd_repo_search(query, tags).await,
            RepoAction::Delete { id } => cmd_repo_delete(id).await,
        },
        Commands::Template { action } => match action {
            TemplateAction::List { category } => cmd_template_list(category).await,
            TemplateAction::Get { name } => cmd_template_get(name).await,
        },
        Commands::Health => cmd_health().await,
    }
}

async fn cmd_start(port: u16, db: Option<String>, memory: bool) -> aitmeow_core::error::Result<()> {
    let mut config = aitmeow_core::config::Config::load();
    config.port = port;
    if memory {
        config.db_path = PathBuf::from(":memory:");
    } else if let Some(path) = db {
        config.db_path = PathBuf::from(path);
    }

    aitmeow_server::check_port(port).await?;
    println!("aitmeow v{} starting on port {}...", env!("CARGO_PKG_VERSION"), port);
    aitmeow_server::start_server(config).await
}

async fn cmd_validate(path: PathBuf, rule_names: Option<Vec<String>>) -> aitmeow_core::error::Result<()> {
    let svg = tokio::fs::read_to_string(&path).await?;
    let rules = match rule_names {
        Some(names) => {
            let mut r = vec![];
            for name in &names {
                match name.as_str() {
                    "viewbox" => r.push(aitmeow_core::rule::Rule::CheckViewBox),
                    "require_ids" => r.push(aitmeow_core::rule::Rule::RequireIds),
                    "max_size" => r.push(aitmeow_core::rule::Rule::MaxSize(102_400)),
                    _ => {}
                }
            }
            r
        }
        None => aitmeow_core::rule::RuleEngine::default_rules().rules.clone(),
    };

    let result = aitmeow_core::svg::validate_svg(&svg, &rules)?;
    println!("{}", serde_json::to_string_pretty(&result).unwrap());

    if !result.valid {
        std::process::exit(1);
    }
    Ok(())
}

async fn cmd_render(
    path: PathBuf,
    output: Option<PathBuf>,
    width: Option<u32>,
    height: Option<u32>,
    background: Option<String>,
) -> aitmeow_core::error::Result<()> {
    let svg = tokio::fs::read_to_string(&path).await?;
    let opts = aitmeow_core::svg::RenderOptions {
        width,
        height,
        background_color: background,
        format: aitmeow_core::svg::OutputFormat::Png,
    };
    let png = aitmeow_core::svg::render_svg(&svg, &opts)?;

    if let Some(out_path) = output {
        tokio::fs::write(&out_path, &png).await?;
        println!("Rendered to {}", out_path.display());
    } else {
        println!("Rendered {} bytes of PNG (use -o to save)", png.len());
    }
    Ok(())
}

async fn cmd_repo_list(tag: Option<String>, limit: u32) -> aitmeow_core::error::Result<()> {
    let config = aitmeow_core::config::Config::load();
    let repo = aitmeow_core::repository::Repository::open(&config.db_path).await?;
    let opts = aitmeow_core::repository::ListOptions {
        tag,
        limit,
        ..Default::default()
    };
    let items = repo.list(&opts).await?;
    let total = repo.count().await?;

    println!("{} SVGs total, showing {}\n", total, items.len());
    for item in &items {
        println!(
            "  {}  {:40}  {} tags  {}",
            &item.id[..8],
            item.name,
            item.tags.len(),
            item.created_at.format("%Y-%m-%d")
        );
    }
    Ok(())
}

async fn cmd_repo_get(id: String) -> aitmeow_core::error::Result<()> {
    let config = aitmeow_core::config::Config::load();
    let repo = aitmeow_core::repository::Repository::open(&config.db_path).await?;
    match repo.get(&id).await? {
        Some(record) => {
            println!("Name: {}", record.name);
            println!("ID: {}", record.id);
            println!("Tags: {:?}", record.tags);
            println!("Template: {:?}", record.template_name);
            println!("Params: {:?}", record.params);
            println!("Created: {}", record.created_at);
            println!("--- SVG ---");
            println!("{}", record.svg_content);
        }
        None => {
            eprintln!("Not found: {}", id);
            std::process::exit(1);
        }
    }
    Ok(())
}

async fn cmd_repo_save(
    path: PathBuf,
    name: Option<String>,
    tags: Vec<String>,
    template: Option<String>,
) -> aitmeow_core::error::Result<()> {
    let config = aitmeow_core::config::Config::load();
    let repo = aitmeow_core::repository::Repository::open(&config.db_path).await?;
    let svg_content = tokio::fs::read_to_string(&path).await?;
    let svg_name = name.unwrap_or_else(|| {
        path.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string()
    });

    let record = aitmeow_core::repository::SvgRecord::new(svg_name.clone(), svg_content)
        .with_template(template.unwrap_or_default())
        .with_tags(tags);

    repo.save(&record).await?;
    println!("Saved: {} ({})", svg_name, &record.id[..8]);
    Ok(())
}

async fn cmd_repo_search(query: Option<String>, tags: Vec<String>) -> aitmeow_core::error::Result<()> {
    let config = aitmeow_core::config::Config::load();
    let repo = aitmeow_core::repository::Repository::open(&config.db_path).await?;
    let results = repo.search(&query.unwrap_or_default(), &tags).await?;
    println!("{} results:", results.len());
    for item in &results {
        println!("  {}  {}", &item.id[..8], item.name);
    }
    Ok(())
}

async fn cmd_repo_delete(id: String) -> aitmeow_core::error::Result<()> {
    let config = aitmeow_core::config::Config::load();
    let repo = aitmeow_core::repository::Repository::open(&config.db_path).await?;
    if repo.delete(&id).await? {
        println!("Deleted {}", id);
    } else {
        eprintln!("Not found: {}", id);
        std::process::exit(1);
    }
    Ok(())
}

async fn cmd_template_list(category: Option<String>) -> aitmeow_core::error::Result<()> {
    let config = aitmeow_core::config::Config::load();
    let mut registry = aitmeow_core::template::TemplateRegistry::new();
    for dir in &config.template_dirs {
        let tmpls = aitmeow_core::template::TemplateRegistry::load_from_dir(dir)?;
        registry.register(tmpls);
    }

    let templates = registry.list();
    let filtered: Vec<_> = templates
        .iter()
        .filter(|t| category.as_ref().map_or(true, |c| t.category == *c))
        .collect();

    println!("{} templates:", filtered.len());
    for t in &filtered {
        println!(
            "  {:<30}  {:20}  {} options",
            t.name, t.category, t.options.len()
        );
    }
    Ok(())
}

async fn cmd_template_get(name: String) -> aitmeow_core::error::Result<()> {
    let config = aitmeow_core::config::Config::load();
    let mut registry = aitmeow_core::template::TemplateRegistry::new();
    for dir in &config.template_dirs {
        let tmpls = aitmeow_core::template::TemplateRegistry::load_from_dir(dir)?;
        registry.register(tmpls);
    }

    match registry.get(&name) {
        Some(t) => println!("{}", serde_json::to_string_pretty(t).unwrap()),
        None => {
            eprintln!("Template not found: {}", name);
            std::process::exit(1);
        }
    }
    Ok(())
}

async fn cmd_health() -> aitmeow_core::error::Result<()> {
    let config = aitmeow_core::config::Config::load();

    println!("aitmeow v{}", env!("CARGO_PKG_VERSION"));
    println!("DB path: {}", config.db_path.display());
    println!("Templates dirs: {:?}", config.template_dirs);
    println!("Max SVG size: {} KB", config.max_svg_size / 1024);
    println!("Default port: {}", config.port);

    let port_ok = aitmeow_server::check_port(config.port).await.is_ok();
    println!("Port {}: {}", config.port, if port_ok { "available" } else { "in use" });

    Ok(())
}

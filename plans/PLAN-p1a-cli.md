# P1a: aitmeow CLI

## Git Branch
`p1a-cli`

## Dependencies
`p0-core` branch completed

## Deliverables
- `crates/aitmeow-cli/` binary crate

## Cargo.toml Dependencies

```toml
[dependencies]
aitmeow-core = { path = "../aitmeow-core" }
clap = { version = "4", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
serde_json = "1"
tracing-subscriber = "0.3"
```

## Command Structure

```
aitmeow
├── start [--port <PORT>] [--db <PATH>]
├── validate <PATH> [-r, --rules <RULES>]
├── render <PATH> [-o, --output <FILE>] [-w, --width <W>] [-h, --height <H>]
├── repo
│   ├── list    [--tag <TAG>] [--sort <FIELD>]
│   ├── get     <ID>
│   ├── save    <PATH> [--name <NAME>] [--tag <TAG>] [--template <NAME>]
│   ├── search  <QUERY> [--tag <TAG>]
│   └── delete  <ID>
├── template
│   ├── list    [--category <CAT>]
│   └── get     <NAME>
└── health
```

## Modules

### `main.rs`
- clap entry point, parse subcommands, init logging (tracing-subscriber)
- Dispatch to command modules

### `commands/mod.rs`
```rust
pub mod start;
pub mod validate;
pub mod render;
pub mod repo;
pub mod template;
pub mod health;
```

### `commands/validate.rs`
```rust
/// aitmeow validate <PATH> [--rules <RULES>]
/// Read file → core::validate_svg → print JSON result
/// Exit code: 0 pass / 1 fail
pub async fn run(args: &ValidateArgs) -> Result<()>;
```

### `commands/start.rs`
```rust
/// aitmeow start [--port <PORT>]
/// 1. Check port availability (try TcpListener::bind)
/// 2. In P1a this is a stub that just checks port + prints ready
///    (full server logic in P1b)
pub async fn run(args: &StartArgs) -> Result<()>;
```

### `commands/render.rs`
```rust
/// aitmeow render <PATH> [-o <FILE>] [-w <W>] [-h <H>]
/// Read file → core::render_svg → write output file or stdout
pub async fn run(args: &RenderArgs) -> Result<()>;
```

### `commands/repo.rs`
```rust
/// repo list | get | save | search | delete
/// Each subcommand delegates to core::repository operations
pub mod repo;
```

### `commands/template.rs`
```rust
/// template list | get
/// List available templates or show template detail with options
pub mod template;
```

### `commands/health.rs`
```rust
/// aitmeow health
/// Check and print: port, DB status, config info as JSON
pub async fn run() -> Result<()>;
```

## Verification
- `cargo build` passes
- All subcommands show correct help with `--help`
- `validate` returns correct result for known files
- `template list` lists built-in templates
- `health` returns JSON status

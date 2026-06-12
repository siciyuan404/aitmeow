# AitMeow 🎨

AI-powered SVG generator with template system and real-time preview.

## Features

- 🎯 **Template-based generation** - Brand logos, illustrations, social banners
- 🖥️ **Dual interface** - Desktop app (Electron) + CLI tool
- ⚡ **Real-time preview** - Instant visual feedback
- 🤖 **Claude AI integration** - MCP (Model Context Protocol) support
- 🎨 **Interactive editing** - Color picker, shape tools, parameter controls

## Quick Start

### Desktop App

```bash
# Install dependencies
cd desktop && npm install

# Start development server
npm run dev
```

### CLI

```bash
# Build and run
cargo run -p aitmeow-cli

# Or install globally
cargo install --path crates/aitmeow-cli
aitmeow --help
```

### Server (HTTP + WebSocket + MCP)

```bash
cargo run -p aitmeow-server
# Default: http://localhost:3000
```

## Project Structure

```
aitmeow/
├── crates/
│   ├── aitmeow-core/      # SVG rendering engine
│   ├── aitmeow-cli/       # Command-line interface
│   └── aitmeow-server/    # HTTP/WS/MCP server
├── desktop/
│   ├── src/               # React UI components
│   ├── electron/          # Electron main process
│   └── templates/         # TOML template files
└── docs/                  # Documentation
```

## Templates

Templates define SVG generation parameters in TOML format:

- `brand-logo.toml` - Company logos and brand marks
- `illustration.toml` - Artistic illustrations
- `social-banner.toml` - Social media headers

## MCP Integration

Use with Claude Code or other MCP clients:

```json
{
  "mcpServers": {
    "aitmeow": {
      "command": "aitmeow-server",
      "args": ["--mcp"]
    }
  }
}
```

Available tools:
- `svg_preview` - Generate and preview SVG with template parameters

## Development

### Prerequisites

- Rust 1.75+
- Node.js 18+
- npm 9+

### Build

```bash
# Rust backend
cargo build --release

# Desktop frontend
cd desktop && npm run build
```

### Testing

```bash
# Rust tests
cargo test

# Frontend tests
cd desktop && npm test
```

## Architecture

- **Core Library** (Rust) - SVG sanitization, rendering, template processing
- **Server** (Axum) - REST API + WebSocket + MCP protocol
- **Desktop** (Electron + React) - Three-panel UI with live preview
- **CLI** (Rust) - Command-line SVG generation

## License

MIT

## Contributing

Pull requests welcome! Please check existing issues first.

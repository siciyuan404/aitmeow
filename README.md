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

MCP 走 HTTP（Streamable HTTP 的简化版：POST JSON-RPC），**不支持 stdio**。
先启动桌面端（它会在 8765 拉起服务端），或手动 `cargo run -p aitmeow-cli -- start --port 8765`，
然后配置客户端：

```json
{
  "mcpServers": {
    "aitmeow": {
      "transport": "http",
      "url": "http://127.0.0.1:8765/mcp"
    }
  }
}
```

Available tools:
- `svg_preview` - 把 SVG 推送到桌面端预览面板；返回 `desktop_connected` 表示桌面端是否在线
- `session_state` - 读取桌面端当前模板、参数、规则和编译后的 prompt

推送事件通过 WebSocket `/ws/preview` 下发，事件 `type` 为 snake_case
（`generation_ready` / `state_updated`），前端订阅时需注意大小写。

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

# AGENTS.md

## 1. 项目

AI 驱动的 SVG 生成器：模板编译 prompt → AI 生成 SVG → 桌面端实时预览。

## 2. 代码分层

依赖方向：`core ← server ← cli`，不能反向依赖。

- `core/`      纯逻辑库，禁止依赖 tokio / axum / HTTP
- `server/`    HTTP + WS + MCP 服务
- `cli/`       命令行入口
- `desktop/`   Electron + React 桌面端

## 3. 铁律

- 错误用 AitmeowError，生产路径禁止 unwrap / expect
- 数据库操作用参数绑定，禁止字符串拼接 SQL
- 提交前 `cargo test` 全过

## 4. 加功能口诀

- 加 REST 接口：`api/` 加 handler → `http.rs` 注册路由 → 前端 `api.ts`
- 加 MCP 工具：`tool_def.rs` 加定义 → `mod.rs` dispatch 加分支
- 加 session 状态：`session.rs` 加字段 → `api/session.rs` 读写
- 改 core 前：确认不引入 HTTP / async 运行时依赖

## 5. 已知坑

- SVG 消毒是正则实现，不可靠，别继续在上面加逻辑
- 两个 main.rs 均可启服务，新功能只加 CLI
- 默认端口 8765

## 6. 构建

```
cargo build --release
cargo test
cargo run -p aitmeow-cli -- start --port 8765 --memory
```

---

## 附录：本文件的修改规则

本文件只记长期稳定的内容，不随代码演进频繁修改。

### 可以加的内容
- 新增了架构层级（如新增一个 crate）
- 新增了必须全局遵守的硬性约定
- 发现了会坑到下一个 AI 的已知问题
- 构建/测试命令变了

### 禁止加的内容
- 模块列表、文件清单、函数签名（直接看代码）
- API 端点清单（代码即文档）
- MCP 工具列表（代码即文档）
- 测试数量、覆盖率数字
- 开发进度、计划、TODO
- ASCII 架构图

### 判断标准
加之前问自己：**这条信息半年后还有用吗？新人不知道会写出 bug 吗？**

两条都不满足就不加。

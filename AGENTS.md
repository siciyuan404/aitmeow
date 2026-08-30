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

- `svg/sanitize.rs` 是 roxmltree 白名单实现（不是正则）：解析 → 过滤 → 重新序列化。
  新代码直接用它，不要另写正则消毒。它的输出是确定的 DOM 序列化结果，可以安全做字节区间切片
- 两个 main.rs 均可启服务，新功能只加 CLI
- 默认端口 8765

## 6. 构建

```
cargo build --release
cargo test
cargo run -p aitmeow-cli -- start --port 8765 --memory
```

## 7. 发布与自动更新

桌面端用 `electron-builder` + `electron-updater` 做自动更新，发布走 GitHub Releases。

### 发版流程

1. 改 `desktop/package.json` 的 `version`（唯一版本源，Rust crate 不参与桌面端版本）
2. `git commit` → `git tag v<x.y.z>` → `git push origin <branch>` → `git push origin v<x.y.z>`
3. CI 自动构建 NSIS 安装包 + `latest.yml` 并上传到 Release
4. 客户端启动 5 秒后静默检查，有新版本后台下载，退出程序时自动安装（无感更新）；
   顶栏只在「下载中 / 已就绪」时出现轻量提示，其余状态不打扰用户

### 版本号铁律

- tag 名必须是 `v<x.y.z>`，且 `<x.y.z>` 必须等于 `desktop/package.json` 的 `version`，否则 CI 校验报错
- 已推送的 tag 不要 force 覆盖，发新版本用新号（如 v0.3.1）

### 已知坑

- **无感更新有自举问题**：更新逻辑随应用一起发布，v0.3.1 及更早是手动下载模式，
  所以第一次必须手动装新安装包，从那之后的版本才能滚动无感更新
- `release/AitMeow-win32-x64/` 是便携解压包（version 停在 0.1.0、`resources/app` 是源码目录副本、
  没有 publish 配置），自动更新对它完全无效，它加载的也是 `resources/app/dist` 而不是 `desktop/dist`
- CI 用 `npm ci`，改了 `desktop/package.json` 依赖后必须本地 `npm install` 同步 `package-lock.json` 再提交，否则 CI 挂在 install 步骤
- 更新状态机在 `desktop/electron/ipc/handlers/update.ts` 的模块全局变量里，不在 Rust 侧；改更新逻辑只动 `desktop/electron/`，不要往 server/core 加更新代码
- `electron-updater` 仅在 `app.isPackaged` 时工作，开发环境检查更新会返回"开发环境不支持"

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

# PLAN — Icon Studio：图标生成设定 / 资源库 / 仓库集合

## 已确认的决策

| 决策点 | 结论 |
|---|---|
| 形状的作用 | **裁切 + prompt 约束都做**：渲染时套 clipPath 底板，同时写进 prompt 让 AI 画在形状内 |
| 动画产出 | **N 张独立帧 SVG**，作为一个帧序列集合存仓库 |
| "包起来" | **数据库里的 Collection**，仓库变成 集合 → 条目 两层 |
| 资源库位置 | **右侧面板分两个 Tab**（素材 / 成品），底层同一张表靠 `record_type` 区分 |

---

## 1. 数据模型变更

### 1.1 新表 `collections`

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | TEXT PK | uuid |
| `name` | TEXT | 集合名，用户可改 |
| `kind` | TEXT | `batch`（一次批量生成）/ `frameset`（帧序列）/ `manual`（手动分组） |
| `tags` | TEXT | JSON 数组 |
| `preset_json` | TEXT | 生成时 IconSpec 的快照，用于"用同样设定再来一次" |
| `created_at` / `updated_at` | TEXT | RFC3339 |

### 1.2 `svg_records` 加列（ALTER TABLE，需 PRAGMA 判重）

| 新增列 | 说明 |
|---|---|
| `collection_id` | 可为 NULL；删除集合时置 NULL 而非级联删 |
| `frame_index` | 帧序号，非动画为 NULL |
| `record_type` | `result` / `asset`，默认 `result` |
| `preset_json` | 单条的设定快照 |

素材（PNG 参考图等）走同一张表：位图内容放已有 `thumbnail` BLOB，`svg_content` 存 SVG 或空串。

### 1.3 迁移策略

`migrate()` 里用 `PRAGMA table_info(svg_records)` 查列名，缺哪列加哪列。
禁止 `DROP TABLE` 重建，历史数据不能丢。

---

## 2. core：新增 `crates/aitmeow-core/src/iconspec/`

纯逻辑，不碰 tokio / axum，符合分层铁律。

- `shape.rs` — `IconShape` 枚举：`Square` / `RoundedSquare { radius }` / `Circle` / `Hexagon` / `Octagon` / `Diamond` / `Free`。
  每种形状输出一个以 viewBox 归一化的 `<path>`，供 clipPath 和描边复用。
  **朝向不进枚举**，统一用 `IconSpec::rotation`（度）：六边形转 30° 即从平边朝上变尖角朝上，
  所有形状通用。`rotation_scale()` 用真实顶点算旋转包围盒收缩，避免 45° 正方形戳出画布。
- `spec.rs` — `IconSpec`
  ```rust
  pub struct IconSpec {
      pub shape: IconShape,
      pub rotation: f64,             // 形状旋转角度（度）
      pub aspect: AspectRatio,       // 1:1 / 4:3 / 16:9 / 3:4
      pub base_size: u32,            // viewBox 基准，512 或 1024
      pub inset: f64,                // 内边距，占短边比例
      pub safe_area: f64,            // 内容安全区 0.5~1，平台图标常用 0.8
      pub overshoot: f64,            // 光学过冲，圆/尖角视觉对齐用
      pub optical_shift: f64,        // 视觉重心垂直偏移
      pub stroke: StrokeSpec,        // None / Line{ dotted, double, dash, gap, align, cap, join }
      pub background: BackgroundSpec,// Transparent / Solid / LinearGradient
      pub palette: PaletteSpec,      // 色彩模式 + 主辅色
      pub style: StyleSpec,          // 风格 + 线条粗细 + 细节层级 + 网格吸附
      pub allow_text: bool,          // 允许图标内含文字（默认关）
      pub animation: AnimationSpec,  // { enabled: bool, frames: u32 }
  }
  ```

### 描边对齐的几何含义（容易搞错）

`StrokeAlign` 不只是视觉偏好，它决定两个**不同**的收缩量：

| 对齐 | `outer_pad_px`（形状外侧留白） | `inner_eat_px`（内容再内缩） |
|---|---|---|
| `Inside` | 0 | 线宽 |
| `Center` | 线宽 / 2 | 线宽 / 2 |
| `Outside` | 线宽 | 0 |

关键是**形状框和内容框必须分开算**：`shape_box()` 只扣外侧留白，`content_box()` 再扣
`inner_eat`。合在一起算会导致描边压住内容边缘。

- `mask.rs` — `apply_spec(svg: &str, spec: &IconSpec) -> Result<String>`
  包一层结构：`<svg viewBox>` → `<defs><clipPath>` → 背景底板 → 被裁切的内容 → 描边路径。
  内容用**嵌套 `<svg>`** 承载（自带 `preserveAspectRatio`），不是硬套 transform。
  **注意**：先过 `svg/sanitize.rs`（roxmltree 白名单，AGENTS.md 里"正则是不可靠"那条已过时），
  它的输出是确定的 DOM 序列化结果，可以安全按 roxmltree 节点字节区间切片提取内容。
- `prompt.rs` — `compile_icon_prompt(&IconPromptRequest) -> Result<String>`
  把形状/旋转/比例/安全区/光学/描边/背景/配色/风格/文字策略/参考元素/帧序号编译成中文 prompt。

验收：`cargo test` 覆盖每种形状的 path 生成与旋转收缩、三种描边对齐的几何、
安全区与光学补偿、prompt 编译、错误路径。

---

## 3. server：API 扩展

- `api/repo.rs`
  - `POST /api/collections` 建集合
  - `GET /api/collections` 列集合（带条目数）
  - `GET /api/collections/:id/items` 集合内条目
  - `PATCH /api/collections/:id` 改名/改标签
  - `DELETE /api/collections/:id`（条目解绑不删除）
  - `list_svgs` 增加 `record_type` / `collection_id` 过滤
- `api/svg.rs` — 生成接口接收 `IconSpec`，返回时过一遍 `apply_spec`
- `session.rs` — 参考元素从单张 `reference_svg` 改成 `Vec<ReferenceItem>`

---

## 4. desktop：UI

- `components/iconspec/IconSpecPanel.tsx` — 左侧设定面板（形状/比例/描边/背景/动画/投放区）
- `components/iconspec/ShapePicker.tsx` — 复用 `components/shapes/` 已有图标，补 Octagon / RoundedSquare
- `components/panels/ResultTray.tsx` — 渲染板块底部，本次批次缩略图，多选 + "打包存入仓库"
- `components/panels/RightPanel.tsx` — 加 Tab（素材 / 成品）+ 集合树，素材卡片支持拖到设定面板投放区

结果托盘和历史缩略图是两回事：`HistoryThumbnails` 是跨批次的，`ResultTray` 只装当前批次，别合并。

---

## 5. 分期

- **P0** core `iconspec` 模块 + 单测
- **P1** server 迁移 + 集合 API + 生成接口接 spec
- **P2** desktop 设定面板 + 结果托盘 + 打包
- **P3** desktop 右侧 Tab + 集合树 + 拖拽参考
- **P4** 帧序列生成（一次出 N 帧并存为 frameset 集合）

---

## 6. 待定

- 八边形/六边形的**朝向**（尖朝上 vs 平边朝上）要不要做成选项
- 描边是画在裁切边界上，还是画在内容外轮廓上（前者稳，后者好看但依赖 AI）
- 存储位置切换：是设置项改 SQLite 文件路径，还是支持导出/导入整个库

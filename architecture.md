# 现代化 Web Anki 技术方案（完整版 v3）

## 🧭 1. 项目概述

本项目的目标是构建一个**本地优先 (Local-First)** 的现代化间隔重复记忆系统，核心理念：

> **数据属于用户，服务只用来增强体验。**

### 1.1 产品目标与定位

- **核心体验**
  - UI 操作零感知延迟，所有主要操作直接命中本地数据库。
  - 完全离线可用：浏览、添加、复习、统计均在本地完成。
  - 支持 Anki 级别的定制能力（字段、模板、调度算法）。

- **市场模式：去中心化分发**
  - 无需登录即可浏览共享牌组市场。
  - 下载共享牌组 → 导入到本地 IndexedDB → 之后完全私有。
  - 后端只提供"只读的牌组索引 + 牌组文件分发"。

- **简洁架构**
  - 纯本地 + 只读牌组市场，无云同步。
  - 后端仅提供共享牌组服务，前端完全自治。

### 1.2 产品定位

**本地优先应用（当前版本）**

- **后端**
  - 仅作为静态资源与元数据服务器：
    - 共享牌组列表、详情；
    - 共享牌组包下载；
    - 管理端（作者上传/更新牌组）。
- **前端**
  - Web + PWA，全功能离线应用：
    - 本地 Deck/Note/Card 管理；
    - FSRS / SM-2 双算法调度（前端实现）；
    - 支持自家格式导入导出；
    - 手动本地备份与数据管理。

> **注意**：本项目不实现云同步功能。所有用户数据完全存储在本地 IndexedDB，用户对数据拥有完全控制权。

---

## 🏗 2. 技术栈与架构原则

### 2.1 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **前端** | React + Vite + TypeScript + shadcn/ui | 现代开发栈，支持组件化与设计系统 |
| **离线存储** | IndexedDB + Dexie.js | Dexie 作为 ORM，配合 `dexie-export-import` |
| **ID 生成** | NanoID（前端生成） | 避免自增 ID，便于数据导入导出 |
| **调度算法** | ts-fsrs + 自研 SM-2 | FSRS v4/v5 + Classic 模式（前端实现） |
| **后端框架** | FastAPI + Async SQLAlchemy | 异步 IO，易开发、性能足够 |
| **数据库** | PostgreSQL | 存储 SharedDeck 元数据 |
| **API 风格** | RESTful + JSON (Gzip/Brotli) | 简洁易调试，可走 CDN |

### 2.2 架构原则

- **Local-First：本地优先**
  - UI 永远以本地 IndexedDB 为真源。
  - 后端仅提供共享牌组服务，不存储用户学习数据。

- **ID 前置生成**
  - 所有核心实体（Deck, Note, Card, ReviewLog 等）ID 均由前端生成 NanoID。
  - 便于数据导入导出，无 ID 冲突问题。

- **不可变性 + 软删除**
  - 数据默认不物理删除，只标记 `deleted_at`。
  - ReviewLog、历史数据保留，为数据分析与回溯做准备。

- **模型与表现适度解耦**
  - NoteModel 定义字段与"卡片类型"；
  - Template/TemplateSet 定义布局与样式；
  - 实现上可以放在一起存，但逻辑上保持边界，方便后期换皮升级。

---

## 🧩 3. 领域模型（Schema）

### 3.1 本地核心实体

#### Deck（牌组）

- `id`: NanoID（主键）
- `name`: string
- `parent_id`: NanoID \| null（父牌组）
- `config`: JSONB（调度设置、显示设置）
- `scheduler`: enum(`"sm2"`, `"fsrs_v4"`, `"fsrs_v5"`)
- `template_set_id`: string（主题 ID，如 `minimal-white`）
- `updated_at`: timestamp
- `deleted_at`: timestamp \| null

#### NoteModel（笔记类型）

> 描述字段结构 + 自带模板定义（强相关的一对多关系）。

- `id`: NanoID
- `name`: string
- `fields`: JSONB
  ```jsonc
  [
    { "name": "Front" },
    { "name": "Back" },
    { "name": "Example" }
  ]
  ```
- `templates`: JSONB
  ```jsonc
  [
    {
      "ord": 0,
      "name": "正向",
      "front": "<div class='card card--word'><div class='card-front'>{{Front}}</div></div>",
      "back": "<div class='card card--word'><div class='card-front'>{{Front}}</div><div class='card-back'>{{Back}}</div><div class='card-example'>{{Example}}</div></div>"
    }
  ]
  ```
- `template_set_id`: string（引用哪个样式主题）
- `updated_at`, `deleted_at`

> 逻辑上：`fields` = 数据结构，`templates` = 渲染占位内容。  
> 样式细节（颜色、字体等）由 TemplateSet 的 CSS 提供。

#### TemplateSet（主题）

- `id`: string（如 `minimal-white`, `dark-glass`）
- `name`: string
- `description`: string
- `version`: int
- `css`: string（或静态文件 URL）
- `meta`: JSONB（比如是否支持暗色模式等）
- `updated_at`

> 前端加载后，将 CSS 注入 `<style>` 或 link。

#### Note（笔记）

- `id`: NanoID
- `guid`: string（语义唯一标识，用于共享牌组内容去重）
- `mid`: NanoID（NoteModel.id）
- `fields`: JSONB（数组与 NoteModel.fields 对应位置）
- `tags`: string[]
- `deck_id`: NanoID（归属牌组）
- `updated_at`: timestamp
- `deleted_at`: timestamp \| null

#### Card（卡片）

- `id`: NanoID
- `nid`: NanoID（Note.id）
- `ord`: int（对应 NoteModel.templates 中的序号）
- `deck_id`: NanoID
- **调度字段（FSRS / SM-2 通用）**
  - `state`: enum(`"new"`, `"learning"`, `"review"`, `"relearning"`)
  - `due`: number（下一次复习的时间戳或天编号）
  - `stability`: number
  - `difficulty`: number
  - `elapsed_days`: number
  - `scheduled_days`: number
  - `reps`: int
  - `lapses`: int
  - `last_review`: timestamp
- `updated_at`, `deleted_at`

#### ReviewLog（复习日志）

- `id`: NanoID
- `cid`: NanoID（Card.id）
- `review_time`: timestamp
- `rating`: int（0~3/4，映射"再来一次、困难、良好、简单"等）
- `state_before`, `state_after`
- `stability_before`, `stability_after`
- `elapsed_days`
- `scheduled_days`
- `created_at`

> 在共享牌组导出时一般会**清理 ReviewLog**，避免泄露个人行为数据。

---

### 3.2 共享牌组相关实体（后端存储）

#### SharedDeck（共享牌组元数据）

- `id`: NanoID
- `slug`: string（用于 URL，如 `toeic-800-core`）
- `title`: string
- `description`: string（Markdown）
- `language`: string（`"zh-CN"`, `"en"` …）
- `tags`: string[]
- `author_id`: User.id
- `card_count`: int（冗余统计）
- `note_count`: int
- `template_set_id`: string（推荐主题）
- `version`: int（递增）
- `content_hash`: string（某个版本内容的哈希）
- `is_featured`: boolean
- `is_official`: boolean
- `download_count`: int（下载次数）
- `created_at`, `updated_at`, `deleted_at`

#### SharedDeckSnapshot（内容快照）

- `id`: NanoID
- `shared_deck_id`: NanoID
- `version`: int
- `export_format_version`: int（导出格式版本）
- `file_url`: string（实际存储的 JSON/压缩包地址）
- `content_hash`: string
- `created_at`

> 后端只需要存元数据 + 文件 URL，文件本身可以放对象存储/CDN。

### 3.3 SharedDeckExport（共享牌组导出格式）

> 这是共享牌组的"自有格式"，用于导出/分发/导入。

示例结构（JSON）：

```jsonc
{
  "format_version": 1,
  "shared_deck": {
    "id": "nanoid_shareddeck_1",
    "title": "托福核心词汇（示例）",
    "description": "xxxx",
    "language": "en",
    "tags": ["词汇", "托福"],
    "template_set_id": "minimal-white",
    "version": 3
  },
  "deck": {
    "id": "nanoid_deck_1",
    "name": "托福核心词汇",
    "config": {
      "scheduler": "fsrs_v4",
      "new_per_day": 30,
      "max_reviews_per_day": 200
    }
  },
  "note_models": [
    {
      "id": "nanoid_model_1",
      "name": "英-中 单词卡",
      "fields": [
        { "name": "Front" },
        { "name": "Back" },
        { "name": "Example" }
      ],
      "templates": [
        {
          "ord": 0,
          "name": "正向卡片",
          "front": "<div class='card card--word'><div class='word'>{{Front}}</div></div>",
          "back": "<div class='card card--word'><div class='word'>{{Front}}</div><div class='meaning'>{{Back}}</div><div class='example muted'>{{Example}}</div></div>"
        }
      ],
      "template_set_id": "minimal-white"
    }
  ],
  "notes": [
    {
      "id": "nanoid_note_1",
      "guid": "word:abandon",
      "mid": "nanoid_model_1",
      "deck_id": "nanoid_deck_1",
      "fields": ["abandon", "放弃；抛弃", "He abandoned the car in the snow."],
      "tags": ["核心词汇", "高频"]
    }
    // ...
  ],
  "cards": [
    {
      "id": "nanoid_card_1",
      "nid": "nanoid_note_1",
      "ord": 0,
      "deck_id": "nanoid_deck_1",
      "state": "new",
      "due": 0
    }
    // ...
  ]
}
```

特点：

- 对前端导入来说，几乎就是"Note/Card/Model/Deck 的快照"；
- `guid` 是关键，用于后续版本更新时 diff；
- 不包含用户相关数据：无 ReviewLog，无个人笔记/标记。

---

## 🔄 4. 核心业务流程

### 4.1 创建笔记与卡片（前端）

**伪代码：**

```ts
const createNote = (model: NoteModel, fields: string[], deckId: string) => {
  const now = Date.now();
  const noteId = nanoid();
  const note = {
    id: noteId,
    guid: generateGUID(fields[0]),  // 基于第一个字段或内容 hash
    mid: model.id,
    deck_id: deckId,
    fields,
    tags: [],
    updated_at: now
  };

  const cards = model.templates.map(tpl => ({
    id: nanoid(),
    nid: noteId,
    deck_id: deckId,
    ord: tpl.ord,
    state: "new",
    due: 0,
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    last_review: null,
    updated_at: now
  }));

  return { note, cards };
};
```

流程要点：

1. 前端生成 Note ID / Card ID（NanoID）。
2. `guid` 用于跨牌组版本的内容匹配。

### 4.2 调度算法（FSRS + SM-2 双引擎）

**调度模式在设置中配置：**

- `scheduler = "sm2"`：Classic 模式；
- `scheduler = "fsrs_v4"` / `"fsrs_v5"`：使用 ts-fsrs。

**复习流程（前端逻辑）：**

1. 用户从"今日待复习队列"中抽取 Card（由本地算法计算）。
2. 用户给出评分：`Again / Hard / Good / Easy` → 映射到 `rating`（0~3/4）。
3. 根据设置选择算法：
   - SM-2：计算下一次间隔、ease factor 等；
   - FSRS：更新 `stability` / `difficulty` / `due` 等。
4. 更新 Card 字段，写入 ReviewLog。
5. 更新 Card、Note 的 `updated_at`。

**优化点：**

- 批量调度（如大量导入后初始化）可放入 Web Worker。
- FSRS 参数可在设置中调整（进阶用户使用）。

### 4.3 数据持久化与备份策略

浏览器 IndexedDB 有被系统清理的可能，需多层防御：

1. **持久化存储申请**
   - 首次加载时调用：
     ```js
     if (navigator.storage && navigator.storage.persist) {
       navigator.storage.persist();
     }
     ```
   - 请求浏览器将存储标记为"持久化"，降低被清理风险。

2. **手动导出/导入**
   - 支持：
     - 本项目原生 `.json` 格式全量导出；
     - 单牌组导出备份；
     - 可选支持 Anki `.apkg` 导入（内部转换为本项目结构）。

3. **数据管理**
   - 存储空间显示；
   - 数据统计（牌组数、笔记数、卡片数、复习记录数）；
   - 清空所有数据功能（危险操作，需确认）。

---

### 4.4 共享牌组下载与导入

**1）浏览共享牌组**

- 无需登录：
  - `GET /shared-decks?filter=...` 返回列表；
  - `GET /shared-decks/{slug}` 返回元数据 + 最新版本 Snapshot 信息。

**2）下载 SharedDeckExport**

- 从 `GET /shared-decks/{slug}/export` 获取 `SharedDeckExport` JSON。
- 前端解析后处理。

**3）导入策略**

- TemplateSet：
  - 若为官方内置主题 ID → 直接引用本地版本；
  - 若为新的主题 ID → 在本地创建一个 TemplateSet 记录。

- NoteModel：
  - 本地无对应 `id` → 直接创建；
  - 本地有同 `id`：保留用户已有版本，导入时生成一个新的 `id`（避免冲突）。

- Deck：
  - 创建本地 Deck 记录，允许用户自定义名称。

- Note & Card：
  - 按导出内容创建；
  - `guid` 用于未来版本更新时 diff（此处初次导入直接插入）。

---

### 4.5 共享牌组更新（Diff 逻辑）

当共享牌组有新版本时：

1. 前端拉取最新 SharedDeckExport（vNext）。
2. 遍历 `notes`：
   - 若本地存在相同 `guid`：
     - 更新 `fields`（内容更新/纠错）；
     - 不修改 Card 的调度状态（`stability`、`due` 等），**保留用户学习进度**；
   - 若 `guid` 不存在：
     - 视为新增 Note/Card，插入本地。
3. 模版与主题：
   - NoteModel 若是官方模型，可以按策略更新；
   - TemplateSet 若版本更新，可替换 CSS，实现全局视觉改进。

---

## 🌐 5. API 设计（RESTful）

### 5.1 通用响应结构

```json
{
  "success": true,
  "code": 200,
  "msg": "OK",
  "data": { },
  "trace_id": "req_x8s7d6f",
  "server_time": 1702296000
}
```

> `trace_id` 用于日志关联与问题排查。

### 5.2 共享牌组相关接口

- `GET /shared-decks`
  - 查询参数：`page`, `page_size`, `language`, `tag`, `q` …
  - 返回：列表 + 分页信息。

- `GET /shared-decks/{slug}`
  - 返回：`SharedDeck` 元数据 + 最新版本号 + 预览信息。

- `GET /shared-decks/{slug}/export`
  - 返回：`SharedDeckExport` JSON。

- `POST /shared-decks/{slug}/download`
  - 增加下载计数。

- 管理端（作者用）：
  - `POST /admin/shared-decks`
  - `PUT /admin/shared-decks/{id}`
  - `POST /admin/shared-decks/{id}/snapshots`

---

## 🔐 6. 安全与性能

### 6.1 安全设计

- **共享牌组数据脱敏**
  - 导出共享牌组时：
    - 删除 ReviewLog；
    - 清理明显的私人字段；
    - 对用户自定义 HTML 进行白名单过滤。

- **内容安全**
  - 预览与渲染模板时，可使用：
    - 安全模板引擎（转义 HTML）；
    - 或对模板语法进行限制，只允许 `{{Field}}` 这种占位符。

### 6.2 性能优化

- **虚拟滚动**
  - 卡片浏览器（Browser）界面使用虚拟列表：
    - React Virtualized / React Window；
    - 可平滑浏览上万条 Note。

- **Web Worker**
  - 将重任务放到 Worker：
    - FSRS 调度计算（大批量初始化）；
    - 导入 `.apkg` / `.json`；
    - 建立全文搜索索引（如 Lunr/FlexSearch）。
  - 主线程仅负责 UI 交互与呈现。

- **按需加载**
  - 大型牌组导入/渲染分批加载；
  - CSS/模板按 TemplateSet 懒加载。

---

## 🧾 7. 总结与方案优势

1. **Local-First + NanoID：**
   - 所有核心行为都在本地完成；
   - 不依赖网络，不惧服务停机；
   - 数据完全属于用户，无隐私泄露风险。

2. **共享牌组自有格式 + 内置好看模板：**
   - 不被 AnkiShare 历史包袱束缚；
   - 可设计统一、美观、可维护的视觉体系；
   - 作者初期可以内置高质量牌组与主题，塑造产品风格。

3. **FSRS + SM-2 双引擎：**
   - 对新手保留经典体验（SM-2）；
   - 对重度用户提供更高效的 FSRS，长期减少无效复习。

4. **简洁可维护的架构：**
   - 完全本地 + 只读市场，后端压力极小；
   - 无云同步复杂性，代码更简洁；
   - NoteModel/Template 的分层设计为未来"换皮、可视化编辑器、多主题"留足空间。

整体上，这是一个**以本地为中心、以共享牌组为入口、以 FSRS 为技术差异点、以模板系统为审美保证**的方案。技术上不难落地，架构简洁，专注于核心价值——帮助用户高效学习。

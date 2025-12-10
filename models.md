下面只做“结构级”的简要描述，不写具体 SQL / 代码，实现细节就交给你和后续的 AI 工具。

---

## 1. 用户与基础

### 1.1 用户

- `User`
  - 标识：`id`
  - 账号信息：`email / password_hash`
  - 时间：`created_at / updated_at`

> 所有数据（牌组、笔记、卡片）都挂在某个用户下。

---

## 2. 笔记类型 & 模板（决定“卡长什么样”）

### 2.1 笔记类型（NoteModel）

- `NoteModel`
  - `id`
  - `user_id`（谁创建 / 拥有这个模型）
  - `name`：如 “Basic Word Card”, “Cloze Sentence”
  - `fields_schema`：JSON，定义字段结构  
    - 包含字段列表：如 `Front / Back / Example / Mnemonic`
    - 排序字段、显示顺序等
  - `css`：该模型对应的样式（前端渲染用）
  - 时间：`created_at / updated_at`

> 决定一个 note 有哪些字段、用什么样式展示。

### 2.2 卡片模板（CardTemplate）

- `CardTemplate`
  - `id`
  - `note_model_id`（属于哪个 NoteModel）
  - `name`：模板名称，如 “正向记忆”、“反向记忆”
  - `ord`：模板序号（从 0 开始）
  - `question_template`：问题侧 HTML 模板（如 `{{Front}}`）
  - `answer_template`：答案侧 HTML 模板（如 `{{FrontSide}}<hr>{{Back}}`）
  - 时间：`created_at / updated_at`

> 一个 NoteModel 可以有多个模板 → 同一条 note 生成多张 card（多向记忆）。

---

## 3. 牌组（Deck）

### 3.1 牌组本身

- `Deck`
  - `id`
  - `user_id`
  - `name`
  - `parent_deck_id`：支持树形结构（可为空）
  - `note_model_id`：**叶子牌组绑定一个 NoteModel**
    - 表示这个牌组里的卡片都用同一种笔记类型
  - `config`：JSON，调度配置等（如每日新卡数、复习数、学习步骤）
  - 软删除：`deleted_at`（可选）
  - 时间：`created_at / updated_at`

> 设计理念：一个“最小学习牌组”只对应一种卡片类型，方便 AI & 市场。

---

## 4. 笔记（Note）与卡片（Card）

### 4.1 笔记（Note）

- `Note`
  - `id`
  - `user_id`
  - `deck_id`
  - `note_model_id`（与 deck 的模型一致，用于查询优化）
  - `fields`：JSON，键值对，字段名 → 内容  
    - 如 `{ "Front": "apple", "Back": "苹果", "Example": "...", ... }`
  - `tags`：JSON 数组或字符串（标签）
  - `source_type`：来源类型
    - 如 `manual / ai / import`
  - `source_meta`：JSON，存 AI 提示词、导入来源等元数据
  - 软删除：`deleted_at`
  - 时间：`created_at / updated_at`

> Note 是“抽象知识单位”；Card 是面向复习的具体单位。

### 4.2 卡片（Card）（含调度信息）

- `Card`
  - `id`
  - `user_id`
  - `note_id`
  - `deck_id`
  - `card_template_id`
  - `ord`：模板序号（冗余字段）
  - 调度状态：
    - `type`：new / learning / review / relearning（可用整数枚举）
    - `queue`：new / learning / review / suspended 等
    - `interval`：当前间隔（天）
    - `ease_factor`：记忆难度系数（如 2500 表示 2.5）
    - `due`：下次复习时间（时间戳或日期）
    - `reps`：复习次数
    - `lapses`：遗忘次数
  - 软删除：`deleted_at`
  - 时间：`created_at / updated_at`

> 所有“什么时候再见到这张卡”的信息都在 Card 上。

---

## 5. 复习日志（ReviewLog）

- `ReviewLog`
  - `id`
  - `user_id`
  - `card_id`
  - `review_time`
  - `rating`：用户选择（Again/Hard/Good/Easy → 1-4）
  - 调度前后对比（可选但推荐）：
    - `prev_interval / new_interval`
    - `prev_ease_factor / new_ease_factor`
    - `prev_due / new_due`
  - `duration_ms`：本次回答耗时
  - `created_at`

> 用于统计/图表/回放，也可用于后端简单校验前端调度结果。

---

## 6. AI 生成记录（AIGeneration）

- `AIGeneration`
  - `id`
  - `user_id`
  - `deck_id`（在哪个牌组下触发）
  - `note_id`（若生成后落库，可记录）
  - `model_name`：使用的 AI 模型名称
  - `prompt_type`：任务类型，如 `generate_note / add_example / translate`
  - `input_payload`：JSON，记录调用时的输入（关键字、字段结构、语言等）
  - `output_payload`：JSON，记录 AI 返回的结构化内容（推荐包含 `note_fields`）
  - `status`：pending / success / failed
  - `error_message`
  - 时间：`created_at / finished_at`

> 既方便调试 & 追踪费用，也能做缓存（相同输入直接复用旧结果）。

---

## 7. 牌组市场（SharedDeck）

- `SharedDeck`
  - `id`
  - `owner_user_id`
  - `name`
  - `description`
  - `language`
  - `tags`：JSON 数组（如 `["托福","高频词"]`）
  - `cover_image_url`
  - `version`
  - `stats`：JSON（下载量、订阅数、评分等聚合数据）
  - `is_active`：是否上架
  - 时间：`created_at / updated_at`

> 你可以在实现时选择：
> - Minimal：只存元数据，实际内容直接从某个 Deck 克隆  
> - Advanced：为 SharedDeck 单独存一套 note/card 快照用于版本管理。

---

## 8. 同步相关（不单独建“同步表”，靠通用字段）

为了云同步：

- 以上表统一具备：
  - `updated_at`
  - `deleted_at`（软删除）
- 同步协议使用：
  - `updated_at > last_sync_at` 查询增量
  - `deleted_at > last_sync_at` 查询删除项
- 复习同步用 `ReviewLog` 作为主载体（本地先记录，定期推送）

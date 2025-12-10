# 现代化 Web Anki 技术方案
## 1. 项目概述

### 1.1 项目目标
构建一个现代化的 Web 端间隔重复记忆系统，提供：
- 类 Anki 的核心功能：笔记类型、模板渲染、间隔重复调度、复习日志
- 多用户支持与牌组层级管理
- 共享牌组市场
- **离线优先**：学习调度逻辑在前端执行，支持断网使用

### 1.2 技术栈

| 层级 | 技术选型 |
|------|----------|
| **后端** | FastAPI + PostgreSQL + 异步 SQLAlchemy |
| **前端** | React + Vite + TypeScript + shadcn/ui |
| **离线存储** | IndexedDB (Dexie) |
| **鉴权** | JWT 双令牌 (access + refresh) |
| **API 规范** | RESTful + 统一 `BaseResponse` |

### 1.3 架构原则
- **分层架构**：Router → Service → Repository，职责清晰
- **离线优先**：前端执行调度，后端仅做持久化与校验
- **统一规范**：响应格式、异常处理、分页查询标准化

---

## 2. 技术架构

### 2.1 系统分层

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  React + TypeScript + shadcn/ui + IndexedDB (Dexie)         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ 调度引擎     │  │ 模板渲染    │  │ 离线存储 + 同步队列  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │ HTTPS / JWT
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (FastAPI)                        │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────────┐   │
│  │  Router  │ →  │ Service  │ →  │    Repository        │   │
│  │ 参数校验  │    │ 业务编排  │    │ 异步 CRUD + 软删除   │   │
│  │ JWT 鉴权  │    │ 事务边界  │    │                      │   │
│  └──────────┘    └──────────┘    └──────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL (Async)                         │
│     索引: user_id, deck_id, note_id, due, update_time       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 分层职责

| 层级 | 职责 | 依赖 |
|------|------|------|
| **Router** | 参数校验（Pydantic）、JWT 鉴权、返回 `BaseResponse` | Service |
| **Service** | 业务编排、schema 校验、幂等校验、事务边界 | Repository |
| **Repository** | 异步 SQLAlchemy CRUD、软删除过滤 | Database |

### 2.3 响应规范

```python
# 统一响应格式
BaseResponse(success=True, code=200, msg="成功", data=result)

# 分页响应
PageResponse(items=[...], total=100, page=1, size=20)

# 异常自动转换
NotFoundException → {"success": false, "code": 404, "msg": "资源不存在"}
```

---

## 3. 领域模型

### 3.1 模型关系图

```
User (1) ──────────────────────────────────────────────────────┐
  │                                                            │
  ├── (N) Deck ←─────────────────────────────────────────┐     │
  │      │ tree structure (parent_id)                    │     │
  │      │ config: JSON                                  │     │
  │      └── bind → NoteModel                            │     │
  │                    │                                 │     │
  │                    ├── (N) CardTemplate              │     │
  │                    │      ord, front_html, back_html │     │
  │                    │                                 │     │
  │                    └── (N) Note ──────────────────────┤     │
  │                           │ fields: JSON, tags       │     │
  │                           │                          │     │
  │                           └── (N) Card ──────────────┤     │
  │                                  │ ord               │     │
  │                                  │ queue/type/interval│     │
  │                                  │ ease/due/reps/lapses│    │
  │                                  │                   │     │
  │                                  └── (N) ReviewLog ──┘     │
  │                                        rating, time_taken  │
  │                                                            │
  └── (N) SharedDeck (发布者) ─────────────────────────────────┘
```

### 3.2 核心实体说明

| 实体 | 说明 | 关键字段 |
|------|------|----------|
| `User` | 用户账户与权限 | email, password_hash, is_superuser |
| `NoteModel` | 笔记类型定义 | fields_schema (JSON), css |
| `CardTemplate` | 卡片模板 | ord, front_html, back_html |
| `Deck` | 牌组（树状） | parent_id, note_model_id, config |
| `Note` | 笔记内容 | fields (JSON), tags |
| `Card` | 卡片实例 | ord, queue, type, interval, ease_factor, due, reps, lapses |
| `ReviewLog` | 复习记录 | rating, interval_before/after, ease_before/after, time_taken |
| `SharedDeck` | 共享牌组元数据 | title, description, tags, cover_url, version, download_count |

---

## 4. 核心业务流程

### 4.1 笔记模型与模板管理
- 系统内置若干 `NoteModel` 与 `CardTemplate`
- **MVP 阶段**：不开放用户自定义，仅可选择使用与预览
- 后续可扩展：用户自定义模型、模板编辑器

### 4.2 牌组管理
```
操作: 新增 / 编辑 / 删除 / 移动
存储: 树形结构 (parent_id)
配置: Deck.config 存储调度参数
离线: 前端 IndexedDB 操作 → 后端同步持久化
```

### 4.3 笔记与卡片生成

```
┌─────────────┐    校验字段    ┌─────────────┐    批量生成    ┌─────────────┐
│  创建 Note  │ ─────────────→ │ NoteModel   │ ─────────────→ │   Cards     │
│ (fields)    │   schema       │ Templates   │   按 ord      │ (调度初始化) │
└─────────────┘                └─────────────┘                └─────────────┘

更新 Note: 同步更新渲染数据，保留卡片调度状态
删除 Note: 软删除，级联软删关联 Card
```

### 4.4 复习调度流程（前端执行）

```
1. 获取今日到期卡片
   └─ 条件: due <= now AND queue IN (learning, due, new)
   └─ 优先级: learning → due → new

2. 展示卡片 & 用户评分 (1-4)
   └─ 1: Again  2: Hard  3: Good  4: Easy

3. 前端计算新调度状态
   └─ 更新: interval, ease_factor, due, queue, type, reps, lapses
   └─ 写入本地 IndexedDB + ReviewLog

4. 异步同步到云端
   └─ 后端幂等校验，不重新计算
```

### 4.5 共享牌组

```
发布流程:
  发行方上传 Deck 树 + NoteModel + Templates + Notes + Cards
  └─ 元数据写入 SharedDeck (标题、描述、标签、封面、版本)

订阅/导入:
  复制完整结构到用户空间
  └─ 新生成 ID，保持跨用户隔离
  └─ 重置卡片调度状态为初始值
```

---

## 5. API 设计

### 5.1 API 版本控制
```
基础路径: /api/v1/
版本策略: URL 路径版本化
向后兼容: 废弃字段保留 2 个版本周期
```

### 5.2 接口清单

| 模块 | 接口 | 说明 |
|------|------|------|
| **Auth** | POST `/auth/register` | 用户注册 |
| | POST `/auth/login` | 登录，返回双令牌 |
| | POST `/auth/refresh` | 刷新 access_token |
| | GET `/auth/me` | 当前用户信息 |
| **NoteModel** | GET `/note-models` | 列表（系统内置） |
| | GET `/note-models/{id}` | 详情含模板 |
| **Deck** | GET `/decks/tree` | 用户牌组树 |
| | POST `/decks` | 创建牌组 |
| | PUT `/decks/{id}` | 更新（含移动） |
| | DELETE `/decks/{id}` | 软删除 |
| **Note** | GET `/notes` | 列表（按 deck/tags 过滤） |
| | POST `/notes` | 创建 + 自动生成 Cards |
| | PUT `/notes/{id}` | 更新字段 |
| | DELETE `/notes/{id}` | 软删除 + 级联 |
| **Card** | GET `/cards` | 按 deck/状态查询 |
| | GET `/cards/due` | 今日到期卡片 |
| **Review** | POST `/reviews` | 提交评分 + ReviewLog |
| **Sync** | GET `/sync/pull` | 增量拉取 |
| | POST `/sync/push` | 批量推送 |
| **SharedDeck** | GET `/shared-decks` | 市场列表 |
| | GET `/shared-decks/{id}` | 详情 |
| | POST `/shared-decks/{id}/import` | 导入到用户空间 |

---

## 6. 数据同步方案

### 6.1 设计目标
- **离线可用**：断网可继续学习
- **最小冲突**：基于版本的乐观锁
- **进度安全**：复习数据优先上传

### 6.2 同步机制

```
变更标识: update_time / version 字段
软删除:   deleted_at 时间戳
游标:     客户端持久化 last_cursor

┌─────────────────────────────────────────────────────────────┐
│                    同步流程                                  │
│                                                             │
│  1. Push (优先)                                             │
│     POST /sync/push                                         │
│     Body: { changes: [...], client_version: "..." }         │
│     Response: { conflicts: [...], accepted: [...] }         │
│                                                             │
│  2. Pull                                                    │
│     GET /sync/pull?cursor={last_cursor}                     │
│     Response: {                                             │
│       data: { table: { upserts: [...], deletes: [...] } },  │
│       next_cursor: "..."                                    │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 冲突处理策略
| 场景 | 策略 |
|------|------|
| 同一卡片同时修改 | 服务端优先，返回冲突提示 |
| 复习记录冲突 | 追加合并，不覆盖 |
| 牌组结构冲突 | 提示用户手动解决 |

### 6.4 前端同步触发时机
- 定时同步：每 5 分钟
- 网络恢复时
- 窗口重新聚焦时
- 用户手动触发
- 关键操作后（如完成一轮复习）

---

## 7. 调度算法

### 7.1 SM-2 变体实现

#### 卡片状态定义
| 字段 | 说明 | 初始值 |
|------|------|--------|
| `queue` | 队列类型 | new |
| `type` | 卡片类型 | new |
| `interval` | 间隔天数 | 0 |
| `ease_factor` | 难度系数 | 2500 (2.5×) |
| `due` | 到期时间 | null |
| `reps` | 复习次数 | 0 |
| `lapses` | 遗忘次数 | 0 |

#### 评分定义
```
1 - Again: 完全忘记，重新学习
2 - Hard:  困难回忆，缩短间隔
3 - Good:  正常回忆，标准间隔
4 - Easy:  轻松回忆，延长间隔
```

### 7.2 Deck 配置参数
```json
{
  "learning_steps": [1, 10],        // 学习步长（分钟）
  "graduating_interval": 1,         // 毕业间隔（天）
  "easy_interval": 4,              // Easy 直接毕业间隔
  "new_cards_per_day": 20,         // 每日新卡上限
  "reviews_per_day": 200,          // 每日复习上限
  "max_interval": 365,             // 最大间隔天数
  "starting_ease": 2500            // 初始难度系数
}
```


## 8. 安全设计

### 8.1 认证与授权

```
JWT 双令牌机制:
├── access_token:  30 分钟有效，用于 API 鉴权
├── refresh_token: 7 天有效，用于刷新 access_token
└── 敏感操作:      需要 CurrentSuperUser 依赖

密码安全:
├── 传输: HTTPS + JSON Body (非 Query 参数)
├── 存储: bcrypt 哈希 (cost=12)
└── 规则: 最少 8 位，含字母和数字
```

### 8.2 模板渲染安全

| 场景 | 风险 | 防护措施 |
|------|------|----------|
| 系统内置模板 | 低 | 信任执行 |
| 用户字段内容 | 中 | HTML 转义 |
| 共享牌组模板 | 高 | CSP + iframe sandbox |

```html
<!-- 共享牌组渲染 iframe -->
<iframe 
  sandbox="allow-scripts" 
  csp="default-src 'self'; script-src 'unsafe-inline'">
</iframe>
```

### 9.3 数据安全

- **软删除审计**：`deleted_at` 保留记录，支持恢复
- **敏感字段排除**：password_hash 等不进入同步流
- **传输加密**：全站 HTTPS + gzip/brotli 压缩
- **SQL 注入防护**：SQLAlchemy ORM + 参数化查询

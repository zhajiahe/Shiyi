# Repository Guidelines

> Shiyi - 类 Anki 的现代化 Web 记忆系统（离线优先架构）

## Project Structure & Module Organization

**Backend (Python FastAPI)**
- `app/api/` - API 路由层
- `app/services/` - 业务逻辑层
- `app/repositories/` - 数据访问层
- `app/models/` - SQLAlchemy ORM 模型
- `app/schemas/` - Pydantic 数据验证
- `app/core/` - 配置、安全、异常处理

**Frontend (React + TypeScript)**
- `web/src/pages/` - 页面组件
- `web/src/components/` - UI 组件
- `web/src/stores/` - Zustand 状态管理
- `web/src/scheduler/` - FSRS 调度算法（离线优先）
- `web/src/db/` - IndexedDB (Dexie) 离线存储

**架构**: Router → Service → Repository | 统一响应 `BaseResponse[T]` | 软删除 `deleted_at`

## Build, Test, and Development Commands

```bash
# Backend (uv)
make install          # 安装依赖
make dev              # 启动开发服务器 (port 8000)
make test             # 运行所有测试
make test-unit        # 单元测试
make test-integration # 集成测试
make check            # lint + format + type-check

# Frontend (pnpm)
cd web
pnpm install && pnpm dev          # 安装并启动开发服务器
pnpm run lint && pnpm run typecheck  # 代码检查
pnpm build                        # 构建

# Full Project
make ci               # CI 完整检查 (提交前运行)
```

## Coding Style & Naming Conventions

**Python** (ruff + mypy, line-length: 120, Python 3.12+)
- 文件/函数: `snake_case` | 类: `PascalCase` | 常量: `UPPER_SNAKE_CASE`
- Service 注入 Repository，抛出自定义异常 (`NotFoundException`, `BadRequestException`)

**TypeScript** (ESLint + Prettier, TS 5.9+, React 19)
- 组件: `PascalCase.tsx` | 工具: `camelCase.ts` | 类型: `PascalCase`

## Testing Guidelines

```
tests/
├── conftest.py       # Fixtures: db, client, auth_headers, superuser_token
├── unit/             # @pytest.mark.unit - 独立单元测试
└── integration/      # @pytest.mark.integration - API 端到端测试
```

**测试模式**:
```python
class TestDeckAPI:
    def test_create_deck(self, client: TestClient, auth_headers: dict):
        response = client.post("/api/v1/decks", json={...}, headers=auth_headers)
        assert response.status_code == 201
        assert response.json()["success"] is True
```

**测试数据库**: SQLite 内存数据库，测试后自动清理数据

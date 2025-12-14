.PHONY: help install dev test test-unit test-integration test-cov lint lint-fix format type-check check \
       db-migrate db-upgrade db-downgrade db-history db-current \
       docker-build docker-run docker-stop docker-dev clean pre-commit-install pre-commit-run \
       web-install web-dev web-build web-lint web-type-check web-format web-format-check web-check check-all ci

# 默认目标
.DEFAULT_GOAL := help

help: ## 显示帮助信息
	@echo "拾遗 Shiyi - 可用命令:"
	@echo ""
	@echo "=== 后端命令 ==="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -v "^web-" | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'
	@echo ""
	@echo "=== 前端命令 ==="
	@grep -E '^web-[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'

# ==================== 开发相关 ====================

install: ## 安装依赖
	@echo "📦 安装依赖..."
	uv sync

dev: ## 启动开发服务器
	@echo "🚀 启动开发服务器..."
	uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# ==================== 测试相关 ====================

test: ## 运行所有测试
	@echo "🧪 运行所有测试..."
	uv run pytest tests/ -v

test-unit: ## 运行单元测试
	@echo "🧪 运行单元测试..."
	uv run pytest tests/unit/ -v -m unit

test-integration: ## 运行集成测试
	@echo "🧪 运行集成测试..."
	uv run pytest tests/integration/ -v -m integration

test-cov: ## 运行测试并生成覆盖率报告
	@echo "🧪 运行测试并生成覆盖率报告..."
	uv run pytest tests/ -v --cov=app --cov-report=html --cov-report=term-missing

# ==================== 代码质量 ====================

lint: ## 代码检查
	@echo "🔍 代码检查..."
	uv run ruff check app/ tests/

lint-fix: ## 代码检查并修复
	@echo "🔧 代码检查并修复..."
	uv run ruff check app/ tests/ --fix

format: ## 格式化代码
	@echo "🎨 格式化代码..."
	uv run ruff format app/ tests/

type-check: ## 类型检查
	@echo "🔍 类型检查..."
	uv run mypy app/

check: lint format type-check ## 运行后端检查（lint + format + type-check）
	@echo "✅ 后端检查完成"

# ==================== 前端相关 ====================

web-install: ## 安装前端依赖
	@echo "📦 安装前端依赖..."
	cd web && pnpm install

web-dev: ## 启动前端开发服务器
	@echo "🚀 启动前端开发服务器..."
	cd web && pnpm dev

web-build: ## 构建前端项目
	@echo "📦 构建前端项目..."
	cd web && pnpm build

web-lint: ## 前端代码检查
	@echo "🔍 前端代码检查..."
	cd web && pnpm run lint

web-type-check: ## 前端类型检查
	@echo "🔍 前端类型检查..."
	cd web && pnpm run typecheck

web-format: ## 前端代码格式化
	@echo "🎨 前端代码格式化..."
	cd web && pnpm run format

web-format-check: ## 前端格式检查
	@echo "🔍 前端格式检查..."
	cd web && pnpm run format:check

web-check: web-type-check web-lint ## 运行前端检查（type-check + lint）
	@echo "✅ 前端检查完成"

# ==================== 完整检查 ====================

check-all: check web-check ## 运行前后端所有检查
	@echo "✅ 前后端检查全部完成"

ci: ## 模拟 CI 完整检查（提交前运行）
	@echo "🔄 运行 CI 检查..."
	@echo ""
	@echo "=== 后端检查 ==="
	uv run ruff check app/ tests/
	uv run ruff format --check app/ tests/
	uv run mypy app/ --ignore-missing-imports
	uv run pytest tests/ -v --tb=short
	@echo ""
	@echo "=== 前端检查 ==="
	cd web && pnpm run typecheck
	cd web && pnpm run lint
	cd web && pnpm run format:check
	cd web && pnpm build
	@echo ""
	@echo "✅ CI 检查全部通过！可以安全提交。"

# ==================== Pre-commit ====================

pre-commit-install: ## 安装 pre-commit hooks
	@echo "🔗 安装 pre-commit hooks..."
	uv run pre-commit install

pre-commit-run: ## 运行 pre-commit 检查
	@echo "🔍 运行 pre-commit 检查..."
	uv run pre-commit run --all-files

# ==================== 清理相关 ====================

clean: ## 清理临时文件
	@echo "🧹 清理临时文件..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@rm -rf htmlcov/ .coverage 2>/dev/null || true
	@echo "✅ 清理完成"

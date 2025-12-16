"""
FastAPI 应用主入口

提供应用配置、路由注册和中间件设置
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.api.admin import router as admin_router
from app.api.cards import router as cards_router
from app.api.decks import router as decks_router
from app.api.note_models import router as note_models_router
from app.api.notes import router as notes_router
from app.api.review_logs import router as review_logs_router
from app.api.shared_decks import router as shared_decks_router
from app.api.users import auth_router
from app.api.users import router as users_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.lifespan import lifespan
from app.middleware.logging import LoggingMiddleware, setup_logging

# 设置日志
setup_logging()

# 创建 FastAPI 应用
app = FastAPI(
    title="Shiyi Study",
    description="Shiyi Study is a platform for learning and studying.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# 注册全局异常处理器
register_exception_handlers(app)

# 添加日志中间件
app.add_middleware(LoggingMiddleware)

# 配置 CORS（从配置文件读取允许的来源）
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 注册路由
@app.get("/", tags=["Root"])
async def root():
    """根路径，健康检查"""
    return {
        "status": "ok",
        "message": "Shiyi App is running!",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health", tags=["Root"])
async def health_check():
    """健康检查接口"""
    return {"status": "healthy", "message": "Application is running"}


# 注册认证路由
app.include_router(auth_router, prefix="/api/v1")

# 注册用户路由
app.include_router(users_router, prefix="/api/v1")

# 注册笔记类型路由
app.include_router(note_models_router, prefix="/api/v1")

# 注册牌组路由
app.include_router(decks_router, prefix="/api/v1")

# 注册笔记路由
app.include_router(notes_router, prefix="/api/v1")

# 注册卡片路由
app.include_router(cards_router, prefix="/api/v1")

# 注册复习日志路由
app.include_router(review_logs_router, prefix="/api/v1")

# 注册共享牌组路由
app.include_router(shared_decks_router, prefix="/api/v1")

# 注册管理员路由
app.include_router(admin_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting FastAPI application...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # 开发模式自动重载
        log_level="info",
    )

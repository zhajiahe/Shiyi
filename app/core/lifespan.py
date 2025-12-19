"""
应用生命周期管理

管理应用启动和关闭时的资源初始化和清理
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from loguru import logger

from app.core.database import AsyncSessionLocal, close_db, init_db
from app.core.seed_data import init_builtin_note_models


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理器

    启动时:
    - 初始化数据库连接
    - 创建数据库表（开发环境）
    - 初始化内置模板

    关闭时:
    - 关闭数据库连接
    - 清理资源
    """
    # 启动时
    logger.info("🚀 应用启动中...")

    try:
        # 初始化数据库
        await init_db()
        logger.info("✅ 数据库初始化成功")

        # 初始化内置模板
        async with AsyncSessionLocal() as session:
            created_count = await init_builtin_note_models(session)
            if created_count > 0:
                logger.info(f"✅ 创建了 {created_count} 个内置模板")
            else:
                logger.info("✅ 内置模板已存在")
    except Exception as e:
        logger.error(f"❌ 初始化失败: {e}")
        raise

    logger.info("✅ 应用启动完成")

    yield

    # 关闭时
    logger.info("🛑 应用关闭中...")

    try:
        await close_db()
        logger.info("✅ 数据库连接已关闭")
    except Exception as e:
        logger.error(f"❌ 数据库关闭失败: {e}")

    logger.info("✅ 应用已关闭")

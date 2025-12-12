"""
初始化内置模板和笔记类型

运行: python scripts/init_seed_data.py
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.core.seed_data import BUILTIN_NOTE_MODELS, BUILTIN_TEMPLATE_SETS
from app.models.note_model import CardTemplate, NoteModel
from app.models.shared_deck import TemplateSet
from app.models.user import User

# 系统用户配置
SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000"
SYSTEM_USER_CONFIG = {
    "id": SYSTEM_USER_ID,
    "username": "system",
    "email": "system@ankiweb.local",
    "nickname": "Anki Web 官方",
    "hashed_password": get_password_hash("AnkiWeb@System2024!"),
    "is_active": True,
    "is_superuser": True,
}


async def init_system_user(db: AsyncSession) -> str:
    """初始化系统管理员用户"""
    print("👤 初始化系统管理员...")
    
    # 检查是否已存在
    result = await db.execute(
        select(User).where(User.id == SYSTEM_USER_ID)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        print(f"  ⏭️  系统用户已存在: {existing.username}")
        return existing.id
    
    user = User(**SYSTEM_USER_CONFIG)
    db.add(user)
    await db.flush()
    print(f"  ✅ 创建系统用户: {SYSTEM_USER_CONFIG['nickname']} (@{SYSTEM_USER_CONFIG['username']})")
    
    return user.id


async def init_template_sets(db: AsyncSession) -> None:
    """初始化内置主题"""
    print("🎨 初始化内置主题...")
    
    for ts_data in BUILTIN_TEMPLATE_SETS:
        # 检查是否已存在
        result = await db.execute(
            select(TemplateSet).where(TemplateSet.id == ts_data["id"])
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"  ⏭️  主题已存在: {ts_data['name']}")
            continue
        
        template_set = TemplateSet(
            id=ts_data["id"],
            name=ts_data["name"],
            description=ts_data["description"],
            css=ts_data["css"],
            is_official=ts_data["is_official"],
        )
        db.add(template_set)
        print(f"  ✅ 创建主题: {ts_data['name']}")
    
    await db.flush()


async def init_note_models(db: AsyncSession, system_user_id: str) -> None:
    """初始化内置笔记类型"""
    print("📝 初始化内置笔记类型...")
    
    for nm_data in BUILTIN_NOTE_MODELS:
        # 检查是否已存在
        result = await db.execute(
            select(NoteModel).where(NoteModel.id == nm_data["id"])
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"  ⏭️  笔记类型已存在: {nm_data['name']}")
            continue
        
        # 创建笔记类型
        note_model = NoteModel(
            id=nm_data["id"],
            user_id=system_user_id,
            name=nm_data["name"],
            fields_schema=nm_data["fields_schema"],
            css=nm_data["css"],
        )
        db.add(note_model)
        await db.flush()
        
        # 创建卡片模板
        for tpl_data in nm_data["templates"]:
            template = CardTemplate(
                note_model_id=nm_data["id"],
                name=tpl_data["name"],
                ord=tpl_data["ord"],
                question_template=tpl_data["question_template"],
                answer_template=tpl_data["answer_template"],
            )
            db.add(template)
        
        print(f"  ✅ 创建笔记类型: {nm_data['name']} ({len(nm_data['templates'])} 个模板)")
    
    await db.flush()


async def main():
    """主函数"""
    print("=" * 50)
    print("🚀 Anki Web 种子数据初始化")
    print("=" * 50)
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. 初始化系统用户
            system_user_id = await init_system_user(db)
            
            # 2. 初始化主题
            await init_template_sets(db)
            
            # 3. 初始化笔记类型
            await init_note_models(db, system_user_id)
            
            await db.commit()
            print("=" * 50)
            print("✅ 种子数据初始化完成！")
            print("")
            print("📋 系统管理员账号:")
            print(f"   用户名: {SYSTEM_USER_CONFIG['username']}")
            print(f"   密码: AnkiWeb@System2024!")
            print("=" * 50)
        except Exception as e:
            await db.rollback()
            print(f"❌ 初始化失败: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())


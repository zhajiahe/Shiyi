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
from app.core.seed_data import BUILTIN_NOTE_MODELS, SAMPLE_SHARED_DECKS
from app.models.deck import Deck
from app.models.note import Card, Note
from app.models.note_model import CardTemplate, NoteModel
from app.models.shared_deck import SharedDeck, SharedDeckSnapshot
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


async def init_shared_decks(db: AsyncSession, system_user_id: str) -> None:
    """初始化示例共享牌组"""
    import hashlib
    from nanoid import generate
    
    print("📦 初始化示例共享牌组...")
    
    for deck_data in SAMPLE_SHARED_DECKS:
        # 检查共享牌组是否已存在
        result = await db.execute(
            select(SharedDeck).where(SharedDeck.id == deck_data["id"])
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"  ⏭️  共享牌组已存在: {deck_data['title']}")
            continue
        
        # 获取笔记类型
        nm_result = await db.execute(
            select(NoteModel).where(NoteModel.id == deck_data["note_model_id"])
        )
        note_model = nm_result.scalar_one_or_none()
        if not note_model:
            print(f"  ⚠️  笔记类型不存在: {deck_data['note_model_id']}")
            continue
        
        # 获取模板
        tpl_result = await db.execute(
            select(CardTemplate).where(
                CardTemplate.note_model_id == deck_data["note_model_id"],
                CardTemplate.deleted_at.is_(None)
            ).order_by(CardTemplate.ord)
        )
        templates = list(tpl_result.scalars().all())
        
        # 1. 创建本地牌组
        deck_id = f"deck-{deck_data['slug']}"
        deck = Deck(
            id=deck_id,
            user_id=system_user_id,
            name=deck_data["title"],
            description=deck_data["description"],
            note_model_id=deck_data["note_model_id"],
            scheduler="sm2",
        )
        db.add(deck)
        await db.flush()
        
        # 2. 创建笔记和卡片
        note_count = 0
        card_count = 0
        for note_data in deck_data["notes"]:
            note_id = generate(size=21)
            # 生成 GUID
            guid = hashlib.md5(str(note_data).encode()).hexdigest()
            
            note = Note(
                id=note_id,
                user_id=system_user_id,
                deck_id=deck_id,
                note_model_id=deck_data["note_model_id"],
                guid=guid,
                fields=note_data,
                tags=deck_data["tags"][:2],  # 取前两个标签
                source_type="manual",
            )
            db.add(note)
            note_count += 1
            
            # 为每个模板创建卡片
            for tpl in templates:
                card = Card(
                    id=generate(size=21),
                    user_id=system_user_id,
                    note_id=note_id,
                    deck_id=deck_id,
                    card_template_id=tpl.id,
                    ord=tpl.ord,
                    state="new",
                    queue="new",
                )
                db.add(card)
                card_count += 1
        
        await db.flush()
        
        # 3. 创建共享牌组
        shared_deck = SharedDeck(
            id=deck_data["id"],
            author_id=system_user_id,
            slug=deck_data["slug"],
            title=deck_data["title"],
            description=deck_data["description"],
            language=deck_data["language"],
            tags=deck_data["tags"],
            note_count=note_count,
            card_count=card_count,
            is_featured=deck_data.get("is_featured", False),
            is_official=deck_data.get("is_official", False),
        )
        db.add(shared_deck)
        await db.flush()
        
        # 4. 创建快照（简化版，实际应该创建导出文件）
        snapshot = SharedDeckSnapshot(
            id=f"snapshot-{deck_data['slug']}-v1",
            shared_deck_id=deck_data["id"],
            version=1,
            export_format_version=1,
            file_url=f"/api/v1/shared-decks/{deck_data['slug']}/export",
            content_hash=hashlib.md5(deck_data["title"].encode()).hexdigest(),
        )
        db.add(snapshot)
        
        print(f"  ✅ 创建共享牌组: {deck_data['title']} ({note_count} 笔记, {card_count} 卡片)")
    
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

            # 2. 初始化笔记类型
            await init_note_models(db, system_user_id)
            
            # 4. 初始化示例共享牌组
            await init_shared_decks(db, system_user_id)
            
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
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(main())


"""
共享牌组服务

处理 SharedDeck 相关的业务逻辑
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.shared_deck import SharedDeck, SharedDeckSnapshot
from app.repositories.shared_deck import SharedDeckRepository, SharedDeckSnapshotRepository
from app.schemas.shared_deck import SharedDeckCreate, SharedDeckListQuery, SharedDeckUpdate


class SharedDeckService:
    """共享牌组服务类"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.shared_deck_repo = SharedDeckRepository(db)
        self.snapshot_repo = SharedDeckSnapshotRepository(db)

    async def get_shared_deck(self, shared_deck_id: str) -> SharedDeck:
        """
        获取单个共享牌组

        Args:
            shared_deck_id: 共享牌组 ID

        Returns:
            SharedDeck 实例
        """
        shared_deck = await self.shared_deck_repo.get_by_id_with_snapshots(shared_deck_id)
        if not shared_deck:
            raise NotFoundException(msg="共享牌组不存在")
        return shared_deck

    async def get_shared_deck_by_slug(self, slug: str) -> SharedDeck:
        """
        根据 slug 获取共享牌组

        Args:
            slug: URL 友好标识

        Returns:
            SharedDeck 实例
        """
        shared_deck = await self.shared_deck_repo.get_by_slug(slug)
        if not shared_deck:
            raise NotFoundException(msg="共享牌组不存在")
        return shared_deck

    async def search_shared_decks(
        self,
        query_params: SharedDeckListQuery,
        page_num: int = 1,
        page_size: int = 10,
    ) -> tuple[list[SharedDeck], int]:
        """
        搜索共享牌组

        Args:
            query_params: 查询参数
            page_num: 页码
            page_size: 每页数量

        Returns:
            (共享牌组列表, 总数) 元组
        """
        skip = (page_num - 1) * page_size
        return await self.shared_deck_repo.search(
            language=query_params.language,
            tag=query_params.tag,
            q=query_params.q,
            is_featured=query_params.is_featured,
            is_official=query_params.is_official,
            skip=skip,
            limit=page_size,
        )

    async def create_shared_deck(self, author_id: str, data: SharedDeckCreate) -> SharedDeck:
        """
        创建共享牌组

        Args:
            author_id: 作者 ID
            data: 创建数据

        Returns:
            创建的 SharedDeck 实例
        """
        # 检查 slug 是否已存在
        if await self.shared_deck_repo.slug_exists(data.slug):
            raise BadRequestException(msg="该标识已被使用")

        return await self.shared_deck_repo.create(
            {
                "author_id": author_id,
                "slug": data.slug,
                "title": data.title,
                "description": data.description,
                "language": data.language,
                "tags": data.tags,
                "cover_image_url": data.cover_image_url,
            }
        )

    async def update_shared_deck(
        self,
        shared_deck_id: str,
        user_id: str,
        data: SharedDeckUpdate,
    ) -> SharedDeck:
        """
        更新共享牌组

        Args:
            shared_deck_id: 共享牌组 ID
            user_id: 当前用户 ID
            data: 更新数据

        Returns:
            更新后的 SharedDeck 实例
        """
        shared_deck = await self.get_shared_deck(shared_deck_id)
        if shared_deck.author_id != user_id:
            raise ForbiddenException(msg="无权限修改此共享牌组")

        update_data = data.model_dump(exclude_unset=True)
        return await self.shared_deck_repo.update(shared_deck, update_data)

    async def delete_shared_deck(self, shared_deck_id: str, user_id: str) -> None:
        """
        删除共享牌组

        Args:
            shared_deck_id: 共享牌组 ID
            user_id: 当前用户 ID
        """
        shared_deck = await self.get_shared_deck(shared_deck_id)
        if shared_deck.author_id != user_id:
            raise ForbiddenException(msg="无权限删除此共享牌组")
        await self.shared_deck_repo.delete(shared_deck_id, soft_delete=True)

    async def get_download_info(self, slug: str) -> SharedDeckSnapshot:
        """
        获取下载信息（最新版本快照）

        Args:
            slug: URL 友好标识

        Returns:
            SharedDeckSnapshot 实例
        """
        shared_deck = await self.get_shared_deck_by_slug(slug)

        # 增加下载计数
        await self.shared_deck_repo.increment_download_count(shared_deck.id)

        # 获取最新快照
        snapshot = await self.snapshot_repo.get_latest_by_deck_id(shared_deck.id)
        if not snapshot:
            raise NotFoundException(msg="该共享牌组暂无可下载版本")
        return snapshot

    async def export_shared_deck(self, slug: str) -> dict:
        """
        导出共享牌组完整数据

        Args:
            slug: URL 友好标识

        Returns:
            包含笔记类型、牌组、笔记、卡片的完整数据
        """
        from sqlalchemy import select

        from app.models.deck import Deck
        from app.models.note import Card, Note
        from app.models.note_model import CardTemplate, NoteModel

        shared_deck = await self.get_shared_deck_by_slug(slug)

        # 获取关联的本地牌组（通过 slug 匹配）
        deck_id = f"deck-{slug}"
        deck_result = await self.db.execute(select(Deck).where(Deck.id == deck_id, Deck.deleted_at.is_(None)))
        deck = deck_result.scalar_one_or_none()

        if not deck:
            raise NotFoundException(msg="共享牌组数据不存在")

        # 获取笔记类型
        note_model_ids = set()
        notes_result = await self.db.execute(select(Note).where(Note.deck_id == deck_id, Note.deleted_at.is_(None)))
        notes = list(notes_result.scalars().all())

        for note in notes:
            note_model_ids.add(note.note_model_id)

        # 获取笔记类型详情
        note_models_data = []
        for nm_id in note_model_ids:
            nm_result = await self.db.execute(
                select(NoteModel).where(NoteModel.id == nm_id, NoteModel.deleted_at.is_(None))
            )
            nm = nm_result.scalar_one_or_none()
            if nm:
                # 获取模板
                tpl_result = await self.db.execute(
                    select(CardTemplate)
                    .where(
                        CardTemplate.note_model_id == nm_id,
                        CardTemplate.deleted_at.is_(None),
                    )
                    .order_by(CardTemplate.ord)
                )
                templates = list(tpl_result.scalars().all())

                note_models_data.append(
                    {
                        "id": nm.id,
                        "name": nm.name,
                        "fields_schema": nm.fields_schema,
                        "css": nm.css,
                        "templates": [
                            {
                                "id": t.id,
                                "name": t.name,
                                "ord": t.ord,
                                "question_template": t.question_template,
                                "answer_template": t.answer_template,
                            }
                            for t in templates
                        ],
                    }
                )

        # 获取卡片
        cards_result = await self.db.execute(select(Card).where(Card.deck_id == deck_id, Card.deleted_at.is_(None)))
        cards = list(cards_result.scalars().all())

        # 增加下载计数
        await self.shared_deck_repo.increment_download_count(shared_deck.id)

        return {
            "note_models": note_models_data,
            "deck": {
                "id": deck.id,
                "name": deck.name,
                "description": deck.description,
                "config": deck.config,
                "scheduler": deck.scheduler,
            },
            "notes": [
                {
                    "id": n.id,
                    "guid": n.guid,
                    "note_model_id": n.note_model_id,
                    "fields": n.fields,
                    "tags": n.tags,
                }
                for n in notes
            ],
            "cards": [
                {
                    "id": c.id,
                    "note_id": c.note_id,
                    "card_template_id": c.card_template_id,
                    "ord": c.ord,
                }
                for c in cards
            ],
        }

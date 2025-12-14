"""
笔记和卡片服务

处理 Note 和 Card 相关的业务逻辑
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.note import Card, Note
from app.repositories.deck import DeckRepository
from app.repositories.note import CardRepository, NoteRepository
from app.repositories.note_model import CardTemplateRepository, NoteModelRepository
from app.schemas.note import CardListQuery, CardUpdate, NoteBatchCreate, NoteBatchResult, NoteCreate, NoteListQuery, NoteUpdate


class NoteService:
    """笔记服务类"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.note_repo = NoteRepository(db)
        self.card_repo = CardRepository(db)
        self.deck_repo = DeckRepository(db)
        self.note_model_repo = NoteModelRepository(db)
        self.card_template_repo = CardTemplateRepository(db)

    async def get_note(self, note_id: str, user_id: str) -> Note:
        """
        获取单个笔记

        Args:
            note_id: 笔记 ID
            user_id: 当前用户 ID

        Returns:
            Note 实例

        Raises:
            NotFoundException: 笔记不存在
            ForbiddenException: 无权限访问
        """
        note = await self.note_repo.get_by_id_with_cards(note_id)
        if not note:
            raise NotFoundException(msg="笔记不存在")
        if note.user_id != user_id:
            raise ForbiddenException(msg="无权限访问此笔记")
        return note

    async def get_notes(
        self,
        user_id: str,
        query_params: NoteListQuery,
        page_num: int = 1,
        page_size: int = 10,
    ) -> tuple[list[Note], int]:
        """
        获取笔记列表

        Args:
            user_id: 用户 ID
            query_params: 查询参数
            page_num: 页码
            page_size: 每页数量

        Returns:
            (笔记列表, 总数) 元组
        """
        skip = (page_num - 1) * page_size
        return await self.note_repo.get_by_user_id(
            user_id=user_id,
            deck_id=query_params.deck_id,
            keyword=query_params.keyword,
            tags=query_params.tags,
            skip=skip,
            limit=page_size,
        )

    async def create_note(self, user_id: str, data: NoteCreate) -> Note:
        """
        创建笔记（同时创建关联的卡片）

        Args:
            user_id: 用户 ID
            data: 创建数据

        Returns:
            创建的 Note 实例

        Raises:
            BadRequestException: 牌组或笔记类型无效
        """
        # 验证牌组
        deck = await self.deck_repo.get_by_id(data.deck_id)
        if not deck:
            raise BadRequestException(msg="牌组不存在")
        if deck.user_id != user_id:
            raise ForbiddenException(msg="无权限访问此牌组")

        # 验证笔记类型
        note_model = await self.note_model_repo.get_by_id_with_templates(data.note_model_id)
        if not note_model:
            raise BadRequestException(msg="笔记类型不存在")
        if note_model.user_id != user_id:
            raise ForbiddenException(msg="无权限访问此笔记类型")

        # 生成 GUID
        guid = NoteRepository.generate_guid(data.fields)

        # 创建笔记
        note = await self.note_repo.create(
            {
                "user_id": user_id,
                "deck_id": data.deck_id,
                "note_model_id": data.note_model_id,
                "guid": guid,
                "fields": data.fields,
                "tags": data.tags,
                "source_type": data.source_type,
                "source_meta": data.source_meta,
                "dirty": 1,
            }
        )

        # 为每个模板创建卡片
        for template in note_model.templates:
            if template.deleted_at is None:
                await self.card_repo.create(
                    {
                        "user_id": user_id,
                        "note_id": note.id,
                        "deck_id": data.deck_id,
                        "card_template_id": template.id,
                        "ord": template.ord,
                        "state": "new",
                        "queue": "new",
                        "due": 0,
                        "interval": 0,
                        "ease_factor": 2500,
                        "reps": 0,
                        "lapses": 0,
                        "stability": 0.0,
                        "difficulty": 0.0,
                        "dirty": 1,
                    }
                )

        # 重新加载以获取卡片
        return await self.note_repo.get_by_id_with_cards(note.id)  # type: ignore

    async def create_notes_batch(self, user_id: str, data: NoteBatchCreate) -> NoteBatchResult:
        """
        批量创建笔记

        Args:
            user_id: 用户 ID
            data: 批量创建数据

        Returns:
            批量创建结果

        Raises:
            BadRequestException: 牌组或笔记类型无效
        """
        # 验证牌组
        deck = await self.deck_repo.get_by_id(data.deck_id)
        if not deck:
            raise BadRequestException(msg="牌组不存在")
        if deck.user_id != user_id:
            raise ForbiddenException(msg="无权限访问此牌组")

        # 验证笔记类型
        note_model = await self.note_model_repo.get_by_id_with_templates(data.note_model_id)
        if not note_model:
            raise BadRequestException(msg="笔记类型不存在")

        # 获取现有 GUID 用于去重
        existing_guids = await self.note_repo.get_guids_by_deck(data.deck_id)

        created_count = 0
        skipped_count = 0
        error_count = 0
        created_ids = []

        templates = [t for t in note_model.templates if t.deleted_at is None]

        for item in data.notes:
            try:
                guid = NoteRepository.generate_guid(item.fields)

                # 检查是否重复
                if guid in existing_guids:
                    skipped_count += 1
                    continue

                # 创建笔记
                note = await self.note_repo.create(
                    {
                        "user_id": user_id,
                        "deck_id": data.deck_id,
                        "note_model_id": data.note_model_id,
                        "guid": guid,
                        "fields": item.fields,
                        "tags": item.tags,
                        "source_type": data.source_type,
                        "dirty": 1,
                    }
                )

                # 为每个模板创建卡片
                for template in templates:
                    await self.card_repo.create(
                        {
                            "user_id": user_id,
                            "note_id": note.id,
                            "deck_id": data.deck_id,
                            "card_template_id": template.id,
                            "ord": template.ord,
                            "state": "new",
                            "queue": "new",
                            "due": 0,
                            "interval": 0,
                            "ease_factor": 2500,
                            "reps": 0,
                            "lapses": 0,
                            "stability": 0.0,
                            "difficulty": 0.0,
                            "dirty": 1,
                        }
                    )

                existing_guids.add(guid)
                created_ids.append(note.id)
                created_count += 1
            except Exception:
                error_count += 1

        return NoteBatchResult(
            created_count=created_count,
            skipped_count=skipped_count,
            error_count=error_count,
            created_ids=created_ids,
        )

    async def update_note(
        self,
        note_id: str,
        user_id: str,
        data: NoteUpdate,
    ) -> Note:
        """
        更新笔记

        Args:
            note_id: 笔记 ID
            user_id: 当前用户 ID
            data: 更新数据

        Returns:
            更新后的 Note 实例
        """
        note = await self.get_note(note_id, user_id)

        # 验证新牌组
        if data.deck_id is not None and data.deck_id != note.deck_id:
            deck = await self.deck_repo.get_by_id(data.deck_id)
            if not deck:
                raise BadRequestException(msg="牌组不存在")
            if deck.user_id != user_id:
                raise ForbiddenException(msg="无权限访问此牌组")

        # 更新数据
        update_data = data.model_dump(exclude_unset=True)
        update_data["dirty"] = 1

        # 如果字段内容变化，重新生成 GUID
        if "fields" in update_data:
            update_data["guid"] = NoteRepository.generate_guid(update_data["fields"])

        await self.note_repo.update(note, update_data)

        # 如果牌组变化，同步更新卡片的牌组
        if data.deck_id is not None and data.deck_id != note.deck_id:
            cards = await self.card_repo.get_by_note_id(note_id)
            for card in cards:
                await self.card_repo.update(card, {"deck_id": data.deck_id, "dirty": 1})

        return await self.note_repo.get_by_id_with_cards(note_id)  # type: ignore

    async def delete_note(self, note_id: str, user_id: str) -> None:
        """
        删除笔记（软删除，同时删除关联的卡片）

        Args:
            note_id: 笔记 ID
            user_id: 当前用户 ID
        """
        await self.get_note(note_id, user_id)  # 验证权限

        # 删除关联的卡片
        cards = await self.card_repo.get_by_note_id(note_id)
        for card in cards:
            await self.card_repo.delete(card.id, soft_delete=True)

        # 删除笔记
        await self.note_repo.delete(note_id, soft_delete=True)


class CardService:
    """卡片服务类"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.card_repo = CardRepository(db)

    async def get_card(self, card_id: str, user_id: str) -> Card:
        """
        获取单个卡片

        Args:
            card_id: 卡片 ID
            user_id: 当前用户 ID

        Returns:
            Card 实例
        """
        card = await self.card_repo.get_by_id(card_id)
        if not card:
            raise NotFoundException(msg="卡片不存在")
        if card.user_id != user_id:
            raise ForbiddenException(msg="无权限访问此卡片")
        return card

    async def get_cards(
        self,
        user_id: str,
        query_params: CardListQuery,
        page_num: int = 1,
        page_size: int = 10,
    ) -> tuple[list[Card], int]:
        """
        获取卡片列表

        Args:
            user_id: 用户 ID
            query_params: 查询参数
            page_num: 页码
            page_size: 每页数量

        Returns:
            (卡片列表, 总数) 元组
        """
        skip = (page_num - 1) * page_size
        return await self.card_repo.get_by_user_id(
            user_id=user_id,
            deck_id=query_params.deck_id,
            state=query_params.state,
            queue=query_params.queue,
            due_before=query_params.due_before,
            skip=skip,
            limit=page_size,
        )

    async def get_due_cards(
        self,
        user_id: str,
        deck_id: str | None = None,
        due_before: int | None = None,
        limit: int = 100,
    ) -> list[Card]:
        """
        获取待复习的卡片

        Args:
            user_id: 用户 ID
            deck_id: 牌组 ID
            due_before: 到期时间之前
            limit: 返回的最大记录数

        Returns:
            卡片列表
        """
        return await self.card_repo.get_due_cards(
            user_id=user_id,
            deck_id=deck_id,
            due_before=due_before,
            limit=limit,
        )

    async def update_card(
        self,
        card_id: str,
        user_id: str,
        data: CardUpdate,
    ) -> Card:
        """
        更新卡片（主要用于调度状态更新）

        Args:
            card_id: 卡片 ID
            user_id: 当前用户 ID
            data: 更新数据

        Returns:
            更新后的 Card 实例
        """
        card = await self.get_card(card_id, user_id)
        update_data = data.model_dump(exclude_unset=True)
        update_data["dirty"] = 1
        return await self.card_repo.update(card, update_data)

    async def suspend_card(self, card_id: str, user_id: str) -> Card:
        """
        暂停卡片

        Args:
            card_id: 卡片 ID
            user_id: 当前用户 ID

        Returns:
            更新后的 Card 实例
        """
        card = await self.get_card(card_id, user_id)
        return await self.card_repo.update(card, {"queue": "suspended", "dirty": 1})

    async def unsuspend_card(self, card_id: str, user_id: str) -> Card:
        """
        恢复卡片

        Args:
            card_id: 卡片 ID
            user_id: 当前用户 ID

        Returns:
            更新后的 Card 实例
        """
        card = await self.get_card(card_id, user_id)
        # 根据状态恢复到对应队列
        queue = "new" if card.state == "new" else "review"
        return await self.card_repo.update(card, {"queue": queue, "dirty": 1})

    async def get_stats(self, user_id: str, deck_id: str | None = None) -> dict[str, int]:
        """
        获取卡片统计

        Args:
            user_id: 用户 ID
            deck_id: 牌组 ID

        Returns:
            状态 -> 数量 字典
        """
        return await self.card_repo.count_by_state(user_id, deck_id)

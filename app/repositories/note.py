"""
笔记和卡片 Repository

封装 Note 和 Card 相关的数据库操作
"""

import hashlib
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.note import Card, Note
from app.repositories.base import BaseRepository


class NoteRepository(BaseRepository[Note]):
    """笔记数据访问层"""

    def __init__(self, db: AsyncSession):
        super().__init__(Note, db)

    async def get_by_id_with_cards(self, id: str) -> Note | None:
        """
        根据 ID 获取笔记（包含卡片）

        Args:
            id: 笔记 ID

        Returns:
            Note 实例或 None
        """
        result = await self.db.execute(
            select(Note)
            .options(selectinload(Note.cards))
            .where(Note.id == id, Note.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_by_user_id(
        self,
        user_id: str,
        *,
        deck_id: str | None = None,
        keyword: str | None = None,
        tags: list[str] | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[Note], int]:
        """
        获取用户的笔记列表

        Args:
            user_id: 用户 ID
            deck_id: 牌组 ID
            keyword: 搜索关键词
            tags: 标签过滤
            skip: 跳过的记录数
            limit: 返回的最大记录数

        Returns:
            (笔记列表, 总数) 元组
        """
        # 基础查询
        query = (
            select(Note)
            .options(selectinload(Note.cards))
            .where(Note.user_id == user_id, Note.deleted_at.is_(None))
        )
        count_query = select(func.count()).select_from(Note).where(
            Note.user_id == user_id, Note.deleted_at.is_(None)
        )

        # 牌组过滤
        if deck_id:
            query = query.where(Note.deck_id == deck_id)
            count_query = count_query.where(Note.deck_id == deck_id)

        # 关键词搜索（在 JSON 字段中搜索）
        # SQLite JSON 搜索：使用 LIKE 模糊匹配
        if keyword:
            # 简单实现：将 fields 转为文本搜索
            keyword_filter = Note.fields.cast(str).like(f"%{keyword}%")
            query = query.where(keyword_filter)
            count_query = count_query.where(keyword_filter)

        # 标签过滤
        if tags:
            # SQLite JSON 数组包含检查
            for tag in tags:
                tag_filter = Note.tags.cast(str).like(f"%{tag}%")
                query = query.where(tag_filter)
                count_query = count_query.where(tag_filter)

        # 获取总数
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # 分页查询
        query = query.order_by(Note.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def get_by_guid(self, user_id: str, guid: str) -> Note | None:
        """
        根据 GUID 获取笔记

        Args:
            user_id: 用户 ID
            guid: 语义唯一标识

        Returns:
            Note 实例或 None
        """
        result = await self.db.execute(
            select(Note).where(
                Note.user_id == user_id,
                Note.guid == guid,
                Note.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    def generate_guid(fields: dict[str, str]) -> str:
        """
        根据字段内容生成 GUID

        Args:
            fields: 字段内容

        Returns:
            GUID 字符串
        """
        # 取第一个非空字段的值作为基础
        content = ""
        for value in fields.values():
            if value:
                content = value
                break
        # 使用 MD5 哈希生成固定长度的 GUID
        return hashlib.md5(content.encode()).hexdigest()


class CardRepository(BaseRepository[Card]):
    """卡片数据访问层"""

    def __init__(self, db: AsyncSession):
        super().__init__(Card, db)

    async def get_by_user_id(
        self,
        user_id: str,
        *,
        deck_id: str | None = None,
        state: str | None = None,
        queue: str | None = None,
        due_before: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[Card], int]:
        """
        获取用户的卡片列表

        Args:
            user_id: 用户 ID
            deck_id: 牌组 ID
            state: 状态过滤
            queue: 队列过滤
            due_before: 到期时间之前
            skip: 跳过的记录数
            limit: 返回的最大记录数

        Returns:
            (卡片列表, 总数) 元组
        """
        # 基础查询
        query = select(Card).where(Card.user_id == user_id, Card.deleted_at.is_(None))
        count_query = select(func.count()).select_from(Card).where(
            Card.user_id == user_id, Card.deleted_at.is_(None)
        )

        # 牌组过滤
        if deck_id:
            query = query.where(Card.deck_id == deck_id)
            count_query = count_query.where(Card.deck_id == deck_id)

        # 状态过滤
        if state:
            query = query.where(Card.state == state)
            count_query = count_query.where(Card.state == state)

        # 队列过滤
        if queue:
            query = query.where(Card.queue == queue)
            count_query = count_query.where(Card.queue == queue)

        # 到期时间过滤
        if due_before is not None:
            query = query.where(Card.due <= due_before)
            count_query = count_query.where(Card.due <= due_before)

        # 获取总数
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # 分页查询
        query = query.order_by(Card.due.asc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return items, total

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
        query = select(Card).where(
            Card.user_id == user_id,
            Card.deleted_at.is_(None),
            Card.queue != "suspended",
        )

        if deck_id:
            query = query.where(Card.deck_id == deck_id)

        if due_before is not None:
            query = query.where(Card.due <= due_before)

        # 按队列优先级和到期时间排序
        query = query.order_by(Card.queue.asc(), Card.due.asc()).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_note_id(self, note_id: str) -> list[Card]:
        """
        获取笔记的所有卡片

        Args:
            note_id: 笔记 ID

        Returns:
            卡片列表
        """
        result = await self.db.execute(
            select(Card)
            .where(Card.note_id == note_id, Card.deleted_at.is_(None))
            .order_by(Card.ord)
        )
        return list(result.scalars().all())

    async def count_by_state(self, user_id: str, deck_id: str | None = None) -> dict[str, int]:
        """
        统计各状态卡片数量

        Args:
            user_id: 用户 ID
            deck_id: 牌组 ID

        Returns:
            状态 -> 数量 字典
        """
        query = select(Card.state, func.count()).where(
            Card.user_id == user_id,
            Card.deleted_at.is_(None),
        )
        if deck_id:
            query = query.where(Card.deck_id == deck_id)

        query = query.group_by(Card.state)
        result = await self.db.execute(query)
        return {row[0]: row[1] for row in result.all()}




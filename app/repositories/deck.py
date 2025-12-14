"""
牌组 Repository

封装 Deck 相关的数据库操作
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.deck import Deck
from app.repositories.base import BaseRepository


class DeckRepository(BaseRepository[Deck]):
    """牌组数据访问层"""

    def __init__(self, db: AsyncSession):
        super().__init__(Deck, db)

    async def get_by_user_id(
        self,
        user_id: str,
        *,
        keyword: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[Deck], int]:
        """
        获取用户的牌组列表

        Args:
            user_id: 用户 ID
            keyword: 搜索关键词
            skip: 跳过的记录数
            limit: 返回的最大记录数

        Returns:
            (牌组列表, 总数) 元组
        """
        # 基础查询
        query = select(Deck).where(Deck.user_id == user_id, Deck.deleted_at.is_(None))
        count_query = select(func.count()).select_from(Deck).where(Deck.user_id == user_id, Deck.deleted_at.is_(None))

        # 关键词搜索
        if keyword:
            keyword_filter = Deck.name.like(f"%{keyword}%")
            query = query.where(keyword_filter)
            count_query = count_query.where(keyword_filter)

        # 获取总数
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # 分页查询
        query = query.order_by(Deck.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def name_exists(
        self,
        user_id: str,
        name: str,
        exclude_id: str | None = None,
    ) -> bool:
        """
        检查名称是否已存在

        Args:
            user_id: 用户 ID
            name: 牌组名称
            exclude_id: 排除的 ID（用于更新时检查）

        Returns:
            是否存在
        """
        query = select(Deck).where(
            Deck.user_id == user_id,
            Deck.name == name,
            Deck.deleted_at.is_(None),
        )
        if exclude_id:
            query = query.where(Deck.id != exclude_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None

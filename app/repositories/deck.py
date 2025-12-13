"""
牌组 Repository

封装 Deck 相关的数据库操作
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.deck import Deck
from app.repositories.base import BaseRepository


class DeckRepository(BaseRepository[Deck]):
    """牌组数据访问层"""

    def __init__(self, db: AsyncSession):
        super().__init__(Deck, db)

    async def get_by_id_with_children(self, id: str) -> Deck | None:
        """
        根据 ID 获取牌组（包含子牌组）

        Args:
            id: 牌组 ID

        Returns:
            Deck 实例或 None
        """
        result = await self.db.execute(
            select(Deck).options(selectinload(Deck.children)).where(Deck.id == id, Deck.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_by_user_id(
        self,
        user_id: str,
        *,
        keyword: str | None = None,
        parent_id: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[Deck], int]:
        """
        获取用户的牌组列表

        Args:
            user_id: 用户 ID
            keyword: 搜索关键词
            parent_id: 父牌组 ID（为 None 时不过滤，为空字符串时查询根牌组）
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

        # 父牌组过滤
        if parent_id is not None:
            if parent_id == "":
                # 查询根牌组
                query = query.where(Deck.parent_id.is_(None))
                count_query = count_query.where(Deck.parent_id.is_(None))
            else:
                query = query.where(Deck.parent_id == parent_id)
                count_query = count_query.where(Deck.parent_id == parent_id)

        # 获取总数
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # 分页查询
        query = query.order_by(Deck.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def get_root_decks_with_children(self, user_id: str) -> list[Deck]:
        """
        获取用户的根牌组（包含完整子树）

        Args:
            user_id: 用户 ID

        Returns:
            根牌组列表（包含子牌组）
        """
        # 递归加载所有子牌组
        result = await self.db.execute(
            select(Deck)
            .options(selectinload(Deck.children, recursion_depth=5))
            .where(
                Deck.user_id == user_id,
                Deck.parent_id.is_(None),
                Deck.deleted_at.is_(None),
            )
            .order_by(Deck.created_at.desc())
        )
        return list(result.scalars().all())

    async def name_exists_in_parent(
        self,
        user_id: str,
        name: str,
        parent_id: str | None,
        exclude_id: str | None = None,
    ) -> bool:
        """
        检查同一父牌组下名称是否已存在

        Args:
            user_id: 用户 ID
            name: 牌组名称
            parent_id: 父牌组 ID
            exclude_id: 排除的 ID（用于更新时检查）

        Returns:
            是否存在
        """
        query = select(Deck).where(
            Deck.user_id == user_id,
            Deck.name == name,
            Deck.deleted_at.is_(None),
        )
        if parent_id is None:
            query = query.where(Deck.parent_id.is_(None))
        else:
            query = query.where(Deck.parent_id == parent_id)
        if exclude_id:
            query = query.where(Deck.id != exclude_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None

    async def is_descendant(self, parent_id: str, child_id: str) -> bool:
        """
        检查 child_id 是否是 parent_id 的后代

        Args:
            parent_id: 父牌组 ID
            child_id: 可能的后代牌组 ID

        Returns:
            是否是后代
        """
        if parent_id == child_id:
            return True

        deck = await self.get_by_id(child_id)
        if not deck or not deck.parent_id:
            return False

        return await self.is_descendant(parent_id, deck.parent_id)

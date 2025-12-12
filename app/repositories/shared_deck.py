"""
共享牌组和主题 Repository

封装 SharedDeck 和 TemplateSet 相关的数据库操作
"""

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.shared_deck import SharedDeck, SharedDeckSnapshot, TemplateSet
from app.repositories.base import BaseRepository


class TemplateSetRepository(BaseRepository[TemplateSet]):
    """主题数据访问层"""

    def __init__(self, db: AsyncSession):
        super().__init__(TemplateSet, db)

    async def get_all_active(self) -> list[TemplateSet]:
        """
        获取所有可用主题

        Returns:
            主题列表
        """
        result = await self.db.execute(
            select(TemplateSet)
            .where(TemplateSet.deleted_at.is_(None))
            .order_by(TemplateSet.is_official.desc(), TemplateSet.created_at.desc())
        )
        return list(result.scalars().all())


class SharedDeckRepository(BaseRepository[SharedDeck]):
    """共享牌组数据访问层"""

    def __init__(self, db: AsyncSession):
        super().__init__(SharedDeck, db)

    async def get_by_slug(self, slug: str) -> SharedDeck | None:
        """
        根据 slug 获取共享牌组

        Args:
            slug: URL 友好标识

        Returns:
            SharedDeck 实例或 None
        """
        result = await self.db.execute(
            select(SharedDeck)
            .options(selectinload(SharedDeck.snapshots))
            .where(SharedDeck.slug == slug, SharedDeck.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_by_id_with_snapshots(self, id: str) -> SharedDeck | None:
        """
        根据 ID 获取共享牌组（包含快照）

        Args:
            id: 共享牌组 ID

        Returns:
            SharedDeck 实例或 None
        """
        result = await self.db.execute(
            select(SharedDeck)
            .options(selectinload(SharedDeck.snapshots))
            .where(SharedDeck.id == id, SharedDeck.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def search(
        self,
        *,
        language: str | None = None,
        tag: str | None = None,
        q: str | None = None,
        is_featured: bool | None = None,
        is_official: bool | None = None,
        author_id: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[SharedDeck], int]:
        """
        搜索共享牌组

        Args:
            language: 语言过滤
            tag: 标签过滤
            q: 搜索关键词
            is_featured: 是否精选
            is_official: 是否官方
            author_id: 作者ID
            skip: 跳过的记录数
            limit: 返回的最大记录数

        Returns:
            (共享牌组列表, 总数) 元组
        """
        # 基础查询 - 只返回已上架的
        query = select(SharedDeck).where(
            SharedDeck.deleted_at.is_(None),
            SharedDeck.is_active == True,  # noqa: E712
        )
        count_query = select(func.count()).select_from(SharedDeck).where(
            SharedDeck.deleted_at.is_(None),
            SharedDeck.is_active == True,  # noqa: E712
        )

        # 语言过滤
        if language:
            query = query.where(SharedDeck.language == language)
            count_query = count_query.where(SharedDeck.language == language)

        # 标签过滤
        if tag:
            tag_filter = SharedDeck.tags.cast(str).like(f"%{tag}%")
            query = query.where(tag_filter)
            count_query = count_query.where(tag_filter)

        # 关键词搜索
        if q:
            keyword_filter = or_(
                SharedDeck.title.like(f"%{q}%"),
                SharedDeck.description.like(f"%{q}%"),
            )
            query = query.where(keyword_filter)
            count_query = count_query.where(keyword_filter)

        # 精选过滤
        if is_featured is not None:
            query = query.where(SharedDeck.is_featured == is_featured)
            count_query = count_query.where(SharedDeck.is_featured == is_featured)

        # 官方过滤
        if is_official is not None:
            query = query.where(SharedDeck.is_official == is_official)
            count_query = count_query.where(SharedDeck.is_official == is_official)

        # 作者过滤
        if author_id:
            query = query.where(SharedDeck.author_id == author_id)
            count_query = count_query.where(SharedDeck.author_id == author_id)

        # 获取总数
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # 分页查询 - 按精选、官方、下载量排序
        query = query.order_by(
            SharedDeck.is_featured.desc(),
            SharedDeck.is_official.desc(),
            SharedDeck.download_count.desc(),
            SharedDeck.created_at.desc(),
        ).offset(skip).limit(limit)
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def slug_exists(self, slug: str, exclude_id: str | None = None) -> bool:
        """
        检查 slug 是否已存在

        Args:
            slug: URL 友好标识
            exclude_id: 排除的 ID

        Returns:
            是否存在
        """
        query = select(SharedDeck).where(
            SharedDeck.slug == slug,
            SharedDeck.deleted_at.is_(None),
        )
        if exclude_id:
            query = query.where(SharedDeck.id != exclude_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None

    async def increment_download_count(self, id: str) -> None:
        """
        增加下载计数

        Args:
            id: 共享牌组 ID
        """
        deck = await self.get_by_id(id)
        if deck:
            deck.download_count += 1
            await self.db.flush()


class SharedDeckSnapshotRepository(BaseRepository[SharedDeckSnapshot]):
    """共享牌组快照数据访问层"""

    def __init__(self, db: AsyncSession):
        super().__init__(SharedDeckSnapshot, db)

    async def get_latest_by_deck_id(self, shared_deck_id: str) -> SharedDeckSnapshot | None:
        """
        获取最新版本的快照

        Args:
            shared_deck_id: 共享牌组 ID

        Returns:
            SharedDeckSnapshot 实例或 None
        """
        result = await self.db.execute(
            select(SharedDeckSnapshot)
            .where(
                SharedDeckSnapshot.shared_deck_id == shared_deck_id,
                SharedDeckSnapshot.deleted_at.is_(None),
            )
            .order_by(SharedDeckSnapshot.version.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_deck_and_version(
        self, shared_deck_id: str, version: int
    ) -> SharedDeckSnapshot | None:
        """
        获取特定版本的快照

        Args:
            shared_deck_id: 共享牌组 ID
            version: 版本号

        Returns:
            SharedDeckSnapshot 实例或 None
        """
        result = await self.db.execute(
            select(SharedDeckSnapshot).where(
                SharedDeckSnapshot.shared_deck_id == shared_deck_id,
                SharedDeckSnapshot.version == version,
                SharedDeckSnapshot.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()




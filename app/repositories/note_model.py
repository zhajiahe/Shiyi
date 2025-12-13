"""
笔记类型 Repository

封装 NoteModel 和 CardTemplate 相关的数据库操作
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.note_model import CardTemplate, NoteModel
from app.repositories.base import BaseRepository


class NoteModelRepository(BaseRepository[NoteModel]):
    """笔记类型数据访问层"""

    def __init__(self, db: AsyncSession):
        super().__init__(NoteModel, db)

    async def get_by_id_with_templates(self, id: str) -> NoteModel | None:
        """
        根据 ID 获取笔记类型（包含模板）

        Args:
            id: 笔记类型 ID

        Returns:
            NoteModel 实例或 None
        """
        result = await self.db.execute(
            select(NoteModel)
            .options(selectinload(NoteModel.templates))
            .where(NoteModel.id == id, NoteModel.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_by_user_id(
        self,
        user_id: str,
        *,
        keyword: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[NoteModel], int]:
        """
        获取用户的笔记类型列表

        Args:
            user_id: 用户 ID
            keyword: 搜索关键词
            skip: 跳过的记录数
            limit: 返回的最大记录数

        Returns:
            (笔记类型列表, 总数) 元组
        """
        # 基础查询
        query = (
            select(NoteModel)
            .options(selectinload(NoteModel.templates))
            .where(NoteModel.user_id == user_id, NoteModel.deleted_at.is_(None))
        )
        count_query = (
            select(func.count())
            .select_from(NoteModel)
            .where(NoteModel.user_id == user_id, NoteModel.deleted_at.is_(None))
        )

        # 关键词搜索
        if keyword:
            keyword_filter = NoteModel.name.like(f"%{keyword}%")
            query = query.where(keyword_filter)
            count_query = count_query.where(keyword_filter)

        # 获取总数
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # 分页查询
        query = query.order_by(NoteModel.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def name_exists(self, user_id: str, name: str, exclude_id: str | None = None) -> bool:
        """
        检查笔记类型名称是否已存在

        Args:
            user_id: 用户 ID
            name: 笔记类型名称
            exclude_id: 排除的 ID（用于更新时检查）

        Returns:
            是否存在
        """
        query = select(NoteModel).where(
            NoteModel.user_id == user_id,
            NoteModel.name == name,
            NoteModel.deleted_at.is_(None),
        )
        if exclude_id:
            query = query.where(NoteModel.id != exclude_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None


class CardTemplateRepository(BaseRepository[CardTemplate]):
    """卡片模板数据访问层"""

    def __init__(self, db: AsyncSession):
        super().__init__(CardTemplate, db)

    async def get_by_note_model_id(self, note_model_id: str) -> list[CardTemplate]:
        """
        获取笔记类型的所有模板

        Args:
            note_model_id: 笔记类型 ID

        Returns:
            模板列表
        """
        result = await self.db.execute(
            select(CardTemplate)
            .where(CardTemplate.note_model_id == note_model_id, CardTemplate.deleted_at.is_(None))
            .order_by(CardTemplate.ord)
        )
        return list(result.scalars().all())

    async def get_max_ord(self, note_model_id: str) -> int:
        """
        获取笔记类型下模板的最大序号

        Args:
            note_model_id: 笔记类型 ID

        Returns:
            最大序号，如果没有模板返回 -1
        """
        result = await self.db.execute(
            select(func.max(CardTemplate.ord)).where(
                CardTemplate.note_model_id == note_model_id,
                CardTemplate.deleted_at.is_(None),
            )
        )
        max_ord = result.scalar()
        return max_ord if max_ord is not None else -1

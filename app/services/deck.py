"""
牌组服务

处理 Deck 相关的业务逻辑
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.deck import Deck
from app.repositories.deck import DeckRepository
from app.schemas.deck import DeckCreate, DeckListQuery, DeckUpdate


class DeckService:
    """牌组服务类"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.deck_repo = DeckRepository(db)

    async def get_deck(self, deck_id: str, user_id: str) -> Deck:
        """
        获取单个牌组

        Args:
            deck_id: 牌组 ID
            user_id: 当前用户 ID

        Returns:
            Deck 实例

        Raises:
            NotFoundException: 牌组不存在
            ForbiddenException: 无权限访问
        """
        deck = await self.deck_repo.get_by_id(deck_id)
        if not deck:
            raise NotFoundException(msg="牌组不存在")
        if deck.user_id != user_id:
            raise ForbiddenException(msg="无权限访问此牌组")
        return deck

    async def get_decks(
        self,
        user_id: str,
        query_params: DeckListQuery,
        page_num: int = 1,
        page_size: int = 10,
    ) -> tuple[list[Deck], int]:
        """
        获取牌组列表

        Args:
            user_id: 用户 ID
            query_params: 查询参数
            page_num: 页码
            page_size: 每页数量

        Returns:
            (牌组列表, 总数) 元组
        """
        skip = (page_num - 1) * page_size
        return await self.deck_repo.get_by_user_id(
            user_id=user_id,
            keyword=query_params.keyword,
            skip=skip,
            limit=page_size,
        )

    async def create_deck(self, user_id: str, data: DeckCreate) -> Deck:
        """
        创建牌组

        Args:
            user_id: 用户 ID
            data: 创建数据

        Returns:
            创建的 Deck 实例

        Raises:
            BadRequestException: 名称已存在
        """
        # 检查名称是否已存在
        if await self.deck_repo.name_exists(user_id, data.name):
            raise BadRequestException(msg="牌组名称已存在")

        # 创建牌组
        return await self.deck_repo.create(
            {
                "user_id": user_id,
                "name": data.name,
                "note_model_id": data.note_model_id,
                "description": data.description,
            }
        )

    async def update_deck(
        self,
        deck_id: str,
        user_id: str,
        data: DeckUpdate,
    ) -> Deck:
        """
        更新牌组

        Args:
            deck_id: 牌组 ID
            user_id: 当前用户 ID
            data: 更新数据

        Returns:
            更新后的 Deck 实例

        Raises:
            NotFoundException: 牌组不存在
            ForbiddenException: 无权限访问
            BadRequestException: 名称已存在
        """
        deck = await self.get_deck(deck_id, user_id)

        # 检查名称是否已存在
        if data.name and data.name != deck.name:
            if await self.deck_repo.name_exists(user_id, data.name, exclude_id=deck_id):
                raise BadRequestException(msg="牌组名称已存在")

        # 更新数据
        update_data = data.model_dump(exclude_unset=True)
        return await self.deck_repo.update(deck, update_data)

    async def delete_deck(self, deck_id: str, user_id: str) -> None:
        """
        删除牌组（软删除）

        Args:
            deck_id: 牌组 ID
            user_id: 当前用户 ID

        Raises:
            NotFoundException: 牌组不存在
            ForbiddenException: 无权限访问
        """
        await self.get_deck(deck_id, user_id)  # 验证权限
        await self.deck_repo.delete(deck_id, soft_delete=True)

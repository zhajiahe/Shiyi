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
            parent_id=query_params.parent_id,
            skip=skip,
            limit=page_size,
        )

    async def get_deck_tree(self, user_id: str) -> list[Deck]:
        """
        获取牌组树

        Args:
            user_id: 用户 ID

        Returns:
            根牌组列表（包含子牌组）
        """
        return await self.deck_repo.get_root_decks_with_children(user_id)

    async def create_deck(self, user_id: str, data: DeckCreate) -> Deck:
        """
        创建牌组

        Args:
            user_id: 用户 ID
            data: 创建数据

        Returns:
            创建的 Deck 实例

        Raises:
            BadRequestException: 名称已存在或父牌组无效
        """
        # 验证父牌组
        if data.parent_id:
            parent = await self.deck_repo.get_by_id(data.parent_id)
            if not parent:
                raise BadRequestException(msg="父牌组不存在")
            if parent.user_id != user_id:
                raise ForbiddenException(msg="无权限访问父牌组")

        # 检查同一父牌组下名称是否已存在
        if await self.deck_repo.name_exists_in_parent(user_id, data.name, data.parent_id):
            raise BadRequestException(msg="同一层级下牌组名称已存在")

        # 创建牌组
        return await self.deck_repo.create(
            {
                "user_id": user_id,
                "name": data.name,
                "parent_id": data.parent_id,
                "note_model_id": data.note_model_id,
                "config": data.config.model_dump(),
                "scheduler": data.scheduler,
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
            BadRequestException: 名称已存在或父牌组无效
        """
        deck = await self.get_deck(deck_id, user_id)

        # 验证新父牌组
        new_parent_id = data.parent_id if data.parent_id is not None else deck.parent_id
        if data.parent_id is not None:
            if data.parent_id:
                parent = await self.deck_repo.get_by_id(data.parent_id)
                if not parent:
                    raise BadRequestException(msg="父牌组不存在")
                if parent.user_id != user_id:
                    raise ForbiddenException(msg="无权限访问父牌组")
                # 防止循环引用
                if await self.deck_repo.is_descendant(deck_id, data.parent_id):
                    raise BadRequestException(msg="不能将牌组移动到自己的子牌组下")

        # 检查同一父牌组下名称是否已存在
        new_name = data.name if data.name is not None else deck.name
        if data.name is not None or data.parent_id is not None:
            if await self.deck_repo.name_exists_in_parent(user_id, new_name, new_parent_id, exclude_id=deck_id):
                raise BadRequestException(msg="同一层级下牌组名称已存在")

        # 更新数据
        update_data = data.model_dump(exclude_unset=True)
        if "config" in update_data and update_data["config"] is not None:
            update_data["config"] = (
                update_data["config"].model_dump()
                if hasattr(update_data["config"], "model_dump")
                else update_data["config"]
            )

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

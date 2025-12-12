"""
共享牌组服务

处理 SharedDeck 和 TemplateSet 相关的业务逻辑
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.shared_deck import SharedDeck, SharedDeckSnapshot, TemplateSet
from app.repositories.shared_deck import (
    SharedDeckRepository,
    SharedDeckSnapshotRepository,
    TemplateSetRepository,
)
from app.schemas.shared_deck import (
    SharedDeckCreate,
    SharedDeckListQuery,
    SharedDeckUpdate,
    TemplateSetCreate,
)


class TemplateSetService:
    """主题服务类"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.template_set_repo = TemplateSetRepository(db)

    async def get_template_set(self, template_set_id: str) -> TemplateSet:
        """
        获取单个主题

        Args:
            template_set_id: 主题 ID

        Returns:
            TemplateSet 实例
        """
        template_set = await self.template_set_repo.get_by_id(template_set_id)
        if not template_set:
            raise NotFoundException(msg="主题不存在")
        return template_set

    async def get_all_template_sets(self) -> list[TemplateSet]:
        """
        获取所有可用主题

        Returns:
            主题列表
        """
        return await self.template_set_repo.get_all_active()

    async def create_template_set(self, data: TemplateSetCreate, is_official: bool = False) -> TemplateSet:
        """
        创建主题

        Args:
            data: 创建数据
            is_official: 是否官方主题

        Returns:
            创建的 TemplateSet 实例
        """
        return await self.template_set_repo.create(
            {
                "name": data.name,
                "description": data.description,
                "css": data.css,
                "meta": data.meta,
                "is_official": is_official,
            }
        )


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
                "template_set_id": data.template_set_id,
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




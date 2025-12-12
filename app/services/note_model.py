"""
笔记类型服务

处理 NoteModel 和 CardTemplate 相关的业务逻辑
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.note_model import CardTemplate, NoteModel
from app.repositories.note_model import CardTemplateRepository, NoteModelRepository
from app.schemas.note_model import (
    CardTemplateCreate,
    CardTemplateUpdate,
    NoteModelCreate,
    NoteModelListQuery,
    NoteModelUpdate,
)


class NoteModelService:
    """笔记类型服务类"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.note_model_repo = NoteModelRepository(db)
        self.card_template_repo = CardTemplateRepository(db)

    async def get_note_model(self, note_model_id: str, user_id: str) -> NoteModel:
        """
        获取单个笔记类型

        Args:
            note_model_id: 笔记类型 ID
            user_id: 当前用户 ID

        Returns:
            NoteModel 实例

        Raises:
            NotFoundException: 笔记类型不存在
            ForbiddenException: 无权限访问
        """
        note_model = await self.note_model_repo.get_by_id_with_templates(note_model_id)
        if not note_model:
            raise NotFoundException(msg="笔记类型不存在")
        if note_model.user_id != user_id:
            raise ForbiddenException(msg="无权限访问此笔记类型")
        return note_model

    async def get_note_models(
        self,
        user_id: str,
        query_params: NoteModelListQuery,
        page_num: int = 1,
        page_size: int = 10,
    ) -> tuple[list[NoteModel], int]:
        """
        获取笔记类型列表

        Args:
            user_id: 用户 ID
            query_params: 查询参数
            page_num: 页码
            page_size: 每页数量

        Returns:
            (笔记类型列表, 总数) 元组
        """
        skip = (page_num - 1) * page_size
        return await self.note_model_repo.get_by_user_id(
            user_id=user_id,
            keyword=query_params.keyword,
            skip=skip,
            limit=page_size,
        )

    async def create_note_model(self, user_id: str, data: NoteModelCreate) -> NoteModel:
        """
        创建笔记类型

        Args:
            user_id: 用户 ID
            data: 创建数据

        Returns:
            创建的 NoteModel 实例

        Raises:
            BadRequestException: 名称已存在
        """
        # 检查名称是否已存在
        if await self.note_model_repo.name_exists(user_id, data.name):
            raise BadRequestException(msg="笔记类型名称已存在")

        # 创建笔记类型
        note_model = await self.note_model_repo.create(
            {
                "user_id": user_id,
                "name": data.name,
                "fields_schema": [f.model_dump() for f in data.fields_schema],
                "css": data.css,
            }
        )

        # 创建卡片模板
        for tpl in data.templates:
            await self.card_template_repo.create(
                {
                    "note_model_id": note_model.id,
                    "name": tpl.name,
                    "ord": tpl.ord,
                    "question_template": tpl.question_template,
                    "answer_template": tpl.answer_template,
                }
            )

        # 重新加载以获取模板
        return await self.note_model_repo.get_by_id_with_templates(note_model.id)  # type: ignore

    async def update_note_model(
        self,
        note_model_id: str,
        user_id: str,
        data: NoteModelUpdate,
    ) -> NoteModel:
        """
        更新笔记类型

        Args:
            note_model_id: 笔记类型 ID
            user_id: 当前用户 ID
            data: 更新数据

        Returns:
            更新后的 NoteModel 实例

        Raises:
            NotFoundException: 笔记类型不存在
            ForbiddenException: 无权限访问
            BadRequestException: 名称已存在
        """
        note_model = await self.get_note_model(note_model_id, user_id)

        # 检查名称是否已存在
        if data.name is not None and data.name != note_model.name:
            if await self.note_model_repo.name_exists(user_id, data.name, exclude_id=note_model_id):
                raise BadRequestException(msg="笔记类型名称已存在")

        # 更新数据
        update_data = data.model_dump(exclude_unset=True)
        if "fields_schema" in update_data and update_data["fields_schema"] is not None:
            update_data["fields_schema"] = [f.model_dump() if hasattr(f, "model_dump") else f for f in update_data["fields_schema"]]

        await self.note_model_repo.update(note_model, update_data)
        return await self.note_model_repo.get_by_id_with_templates(note_model_id)  # type: ignore

    async def delete_note_model(self, note_model_id: str, user_id: str) -> None:
        """
        删除笔记类型（软删除）

        Args:
            note_model_id: 笔记类型 ID
            user_id: 当前用户 ID

        Raises:
            NotFoundException: 笔记类型不存在
            ForbiddenException: 无权限访问
        """
        await self.get_note_model(note_model_id, user_id)  # 验证权限
        await self.note_model_repo.delete(note_model_id, soft_delete=True)

    # ==================== 卡片模板相关 ====================

    async def get_card_template(
        self,
        note_model_id: str,
        template_id: str,
        user_id: str,
    ) -> CardTemplate:
        """
        获取单个卡片模板

        Args:
            note_model_id: 笔记类型 ID
            template_id: 模板 ID
            user_id: 当前用户 ID

        Returns:
            CardTemplate 实例

        Raises:
            NotFoundException: 模板不存在
            ForbiddenException: 无权限访问
        """
        # 验证笔记类型权限
        await self.get_note_model(note_model_id, user_id)

        template = await self.card_template_repo.get_by_id(template_id)
        if not template or template.note_model_id != note_model_id:
            raise NotFoundException(msg="卡片模板不存在")
        return template

    async def create_card_template(
        self,
        note_model_id: str,
        user_id: str,
        data: CardTemplateCreate,
    ) -> CardTemplate:
        """
        创建卡片模板

        Args:
            note_model_id: 笔记类型 ID
            user_id: 当前用户 ID
            data: 创建数据

        Returns:
            创建的 CardTemplate 实例

        Raises:
            NotFoundException: 笔记类型不存在
            ForbiddenException: 无权限访问
        """
        # 验证笔记类型权限
        await self.get_note_model(note_model_id, user_id)

        # 获取最大序号
        max_ord = await self.card_template_repo.get_max_ord(note_model_id)
        ord_value = data.ord if data.ord > max_ord else max_ord + 1

        return await self.card_template_repo.create(
            {
                "note_model_id": note_model_id,
                "name": data.name,
                "ord": ord_value,
                "question_template": data.question_template,
                "answer_template": data.answer_template,
            }
        )

    async def update_card_template(
        self,
        note_model_id: str,
        template_id: str,
        user_id: str,
        data: CardTemplateUpdate,
    ) -> CardTemplate:
        """
        更新卡片模板

        Args:
            note_model_id: 笔记类型 ID
            template_id: 模板 ID
            user_id: 当前用户 ID
            data: 更新数据

        Returns:
            更新后的 CardTemplate 实例
        """
        template = await self.get_card_template(note_model_id, template_id, user_id)
        update_data = data.model_dump(exclude_unset=True)
        return await self.card_template_repo.update(template, update_data)

    async def delete_card_template(
        self,
        note_model_id: str,
        template_id: str,
        user_id: str,
    ) -> None:
        """
        删除卡片模板（软删除）

        Args:
            note_model_id: 笔记类型 ID
            template_id: 模板 ID
            user_id: 当前用户 ID

        Raises:
            NotFoundException: 模板不存在
            ForbiddenException: 无权限访问
        """
        await self.get_card_template(note_model_id, template_id, user_id)  # 验证权限
        await self.card_template_repo.delete(template_id, soft_delete=True)




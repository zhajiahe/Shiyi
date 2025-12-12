"""
笔记类型 API 路由

提供 NoteModel 和 CardTemplate 的 CRUD 操作
"""

from fastapi import APIRouter, Depends, status

from app.core.deps import CurrentUser, DBSession
from app.models.base import BasePageQuery, BaseResponse, PageResponse
from app.schemas.note_model import (
    CardTemplateCreate,
    CardTemplateResponse,
    CardTemplateUpdate,
    NoteModelCreate,
    NoteModelListQuery,
    NoteModelResponse,
    NoteModelUpdate,
)
from app.services.note_model import NoteModelService

router = APIRouter(prefix="/note-models", tags=["note-models"])


# ==================== 笔记类型接口 ====================


@router.get("", response_model=BaseResponse[PageResponse[NoteModelResponse]])
async def get_note_models(
    db: DBSession,
    current_user: CurrentUser,
    page_query: BasePageQuery = Depends(),
    query_params: NoteModelListQuery = Depends(),
):
    """获取笔记类型列表（分页）"""
    service = NoteModelService(db)
    items, total = await service.get_note_models(
        user_id=current_user.id,
        query_params=query_params,
        page_num=page_query.page_num,
        page_size=page_query.page_size,
    )
    return BaseResponse(
        success=True,
        code=200,
        msg="获取笔记类型列表成功",
        data=PageResponse(
            page_num=page_query.page_num,
            page_size=page_query.page_size,
            total=total,
            items=[NoteModelResponse.model_validate(item) for item in items],
        ),
    )


@router.get("/{note_model_id}", response_model=BaseResponse[NoteModelResponse])
async def get_note_model(
    note_model_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """获取单个笔记类型详情"""
    service = NoteModelService(db)
    item = await service.get_note_model(note_model_id, current_user.id)
    return BaseResponse(
        success=True,
        code=200,
        msg="获取笔记类型成功",
        data=NoteModelResponse.model_validate(item),
    )


@router.post("", response_model=BaseResponse[NoteModelResponse], status_code=status.HTTP_201_CREATED)
async def create_note_model(
    data: NoteModelCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """创建笔记类型"""
    service = NoteModelService(db)
    item = await service.create_note_model(current_user.id, data)
    return BaseResponse(
        success=True,
        code=201,
        msg="创建笔记类型成功",
        data=NoteModelResponse.model_validate(item),
    )


@router.put("/{note_model_id}", response_model=BaseResponse[NoteModelResponse])
async def update_note_model(
    note_model_id: str,
    data: NoteModelUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """更新笔记类型"""
    service = NoteModelService(db)
    item = await service.update_note_model(note_model_id, current_user.id, data)
    return BaseResponse(
        success=True,
        code=200,
        msg="更新笔记类型成功",
        data=NoteModelResponse.model_validate(item),
    )


@router.delete("/{note_model_id}", response_model=BaseResponse[None])
async def delete_note_model(
    note_model_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """删除笔记类型（软删除）"""
    service = NoteModelService(db)
    await service.delete_note_model(note_model_id, current_user.id)
    return BaseResponse(success=True, code=200, msg="删除笔记类型成功", data=None)


# ==================== 卡片模板接口 ====================


@router.get(
    "/{note_model_id}/templates/{template_id}",
    response_model=BaseResponse[CardTemplateResponse],
)
async def get_card_template(
    note_model_id: str,
    template_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """获取单个卡片模板"""
    service = NoteModelService(db)
    item = await service.get_card_template(note_model_id, template_id, current_user.id)
    return BaseResponse(
        success=True,
        code=200,
        msg="获取卡片模板成功",
        data=CardTemplateResponse.model_validate(item),
    )


@router.post(
    "/{note_model_id}/templates",
    response_model=BaseResponse[CardTemplateResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_card_template(
    note_model_id: str,
    data: CardTemplateCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """创建卡片模板"""
    service = NoteModelService(db)
    item = await service.create_card_template(note_model_id, current_user.id, data)
    return BaseResponse(
        success=True,
        code=201,
        msg="创建卡片模板成功",
        data=CardTemplateResponse.model_validate(item),
    )


@router.put(
    "/{note_model_id}/templates/{template_id}",
    response_model=BaseResponse[CardTemplateResponse],
)
async def update_card_template(
    note_model_id: str,
    template_id: str,
    data: CardTemplateUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """更新卡片模板"""
    service = NoteModelService(db)
    item = await service.update_card_template(note_model_id, template_id, current_user.id, data)
    return BaseResponse(
        success=True,
        code=200,
        msg="更新卡片模板成功",
        data=CardTemplateResponse.model_validate(item),
    )


@router.delete(
    "/{note_model_id}/templates/{template_id}",
    response_model=BaseResponse[None],
)
async def delete_card_template(
    note_model_id: str,
    template_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """删除卡片模板（软删除）"""
    service = NoteModelService(db)
    await service.delete_card_template(note_model_id, template_id, current_user.id)
    return BaseResponse(success=True, code=200, msg="删除卡片模板成功", data=None)




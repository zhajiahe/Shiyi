"""
笔记 API 路由

提供 Note 的 CRUD 操作
"""

from fastapi import APIRouter, Depends, status

from app.core.deps import CurrentUser, DBSession
from app.models.base import BasePageQuery, BaseResponse, PageResponse
from app.schemas.note import (
    NoteCreate,
    NoteListQuery,
    NoteResponse,
    NoteUpdate,
)
from app.services.note import NoteService

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=BaseResponse[PageResponse[NoteResponse]])
async def get_notes(
    db: DBSession,
    current_user: CurrentUser,
    page_query: BasePageQuery = Depends(),
    query_params: NoteListQuery = Depends(),
):
    """获取笔记列表（分页）"""
    service = NoteService(db)
    items, total = await service.get_notes(
        user_id=current_user.id,
        query_params=query_params,
        page_num=page_query.page_num,
        page_size=page_query.page_size,
    )
    return BaseResponse(
        success=True,
        code=200,
        msg="获取笔记列表成功",
        data=PageResponse(
            page_num=page_query.page_num,
            page_size=page_query.page_size,
            total=total,
            items=[NoteResponse.model_validate(item) for item in items],
        ),
    )


@router.get("/{note_id}", response_model=BaseResponse[NoteResponse])
async def get_note(
    note_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """获取单个笔记详情"""
    service = NoteService(db)
    item = await service.get_note(note_id, current_user.id)
    return BaseResponse(
        success=True,
        code=200,
        msg="获取笔记成功",
        data=NoteResponse.model_validate(item),
    )


@router.post("", response_model=BaseResponse[NoteResponse], status_code=status.HTTP_201_CREATED)
async def create_note(
    data: NoteCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """创建笔记（同时自动创建关联的卡片）"""
    service = NoteService(db)
    item = await service.create_note(current_user.id, data)
    return BaseResponse(
        success=True,
        code=201,
        msg="创建笔记成功",
        data=NoteResponse.model_validate(item),
    )


@router.put("/{note_id}", response_model=BaseResponse[NoteResponse])
async def update_note(
    note_id: str,
    data: NoteUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """更新笔记"""
    service = NoteService(db)
    item = await service.update_note(note_id, current_user.id, data)
    return BaseResponse(
        success=True,
        code=200,
        msg="更新笔记成功",
        data=NoteResponse.model_validate(item),
    )


@router.delete("/{note_id}", response_model=BaseResponse[None])
async def delete_note(
    note_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """删除笔记（软删除，同时删除关联的卡片）"""
    service = NoteService(db)
    await service.delete_note(note_id, current_user.id)
    return BaseResponse(success=True, code=200, msg="删除笔记成功", data=None)




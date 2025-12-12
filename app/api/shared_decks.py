"""
共享牌组 API 路由

提供 SharedDeck 的公开浏览和下载接口
"""

from fastapi import APIRouter, Depends, status

from app.core.deps import CurrentUser, DBSession
from app.models.base import BasePageQuery, BaseResponse, PageResponse
from app.schemas.shared_deck import (
    SharedDeckCreate,
    SharedDeckDetailResponse,
    SharedDeckListQuery,
    SharedDeckResponse,
    SharedDeckSnapshotResponse,
    SharedDeckUpdate,
    TemplateSetCreate,
    TemplateSetResponse,
)
from app.services.shared_deck import SharedDeckService, TemplateSetService

router = APIRouter(prefix="/shared-decks", tags=["shared-decks"])
template_set_router = APIRouter(prefix="/template-sets", tags=["template-sets"])


# ==================== 主题接口 ====================


@template_set_router.get("", response_model=BaseResponse[list[TemplateSetResponse]])
async def get_template_sets(db: DBSession):
    """获取所有可用主题（公开接口）"""
    service = TemplateSetService(db)
    items = await service.get_all_template_sets()
    return BaseResponse(
        success=True,
        code=200,
        msg="获取主题列表成功",
        data=[TemplateSetResponse.model_validate(item) for item in items],
    )


@template_set_router.get("/{template_set_id}", response_model=BaseResponse[TemplateSetResponse])
async def get_template_set(template_set_id: str, db: DBSession):
    """获取单个主题详情（公开接口）"""
    service = TemplateSetService(db)
    item = await service.get_template_set(template_set_id)
    return BaseResponse(
        success=True,
        code=200,
        msg="获取主题成功",
        data=TemplateSetResponse.model_validate(item),
    )


@template_set_router.post(
    "",
    response_model=BaseResponse[TemplateSetResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_template_set(
    data: TemplateSetCreate,
    db: DBSession,
    _current_user: CurrentUser,
):
    """创建主题（需要登录）"""
    service = TemplateSetService(db)
    item = await service.create_template_set(data)
    return BaseResponse(
        success=True,
        code=201,
        msg="创建主题成功",
        data=TemplateSetResponse.model_validate(item),
    )


# ==================== 共享牌组公开接口 ====================


@router.get("", response_model=BaseResponse[PageResponse[SharedDeckResponse]])
async def get_shared_decks(
    db: DBSession,
    page_query: BasePageQuery = Depends(),
    query_params: SharedDeckListQuery = Depends(),
):
    """浏览共享牌组列表（公开接口，无需登录）"""
    service = SharedDeckService(db)
    items, total = await service.search_shared_decks(
        query_params=query_params,
        page_num=page_query.page_num,
        page_size=page_query.page_size,
    )
    return BaseResponse(
        success=True,
        code=200,
        msg="获取共享牌组列表成功",
        data=PageResponse(
            page_num=page_query.page_num,
            page_size=page_query.page_size,
            total=total,
            items=[SharedDeckResponse.model_validate(item) for item in items],
        ),
    )


@router.get("/{slug}", response_model=BaseResponse[SharedDeckDetailResponse])
async def get_shared_deck(slug: str, db: DBSession):
    """获取共享牌组详情（公开接口，无需登录）"""
    service = SharedDeckService(db)
    item = await service.get_shared_deck_by_slug(slug)
    return BaseResponse(
        success=True,
        code=200,
        msg="获取共享牌组成功",
        data=SharedDeckDetailResponse.model_validate(item),
    )


@router.get("/{slug}/download", response_model=BaseResponse[SharedDeckSnapshotResponse])
async def get_shared_deck_download(slug: str, db: DBSession):
    """获取共享牌组下载信息（公开接口，无需登录）"""
    service = SharedDeckService(db)
    snapshot = await service.get_download_info(slug)
    return BaseResponse(
        success=True,
        code=200,
        msg="获取下载信息成功",
        data=SharedDeckSnapshotResponse.model_validate(snapshot),
    )


# ==================== 共享牌组管理接口 ====================


@router.post("", response_model=BaseResponse[SharedDeckResponse], status_code=status.HTTP_201_CREATED)
async def create_shared_deck(
    data: SharedDeckCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """创建共享牌组（需要登录）"""
    service = SharedDeckService(db)
    item = await service.create_shared_deck(current_user.id, data)
    return BaseResponse(
        success=True,
        code=201,
        msg="创建共享牌组成功",
        data=SharedDeckResponse.model_validate(item),
    )


@router.put("/{shared_deck_id}", response_model=BaseResponse[SharedDeckResponse])
async def update_shared_deck(
    shared_deck_id: str,
    data: SharedDeckUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """更新共享牌组（需要登录且是作者）"""
    service = SharedDeckService(db)
    item = await service.update_shared_deck(shared_deck_id, current_user.id, data)
    return BaseResponse(
        success=True,
        code=200,
        msg="更新共享牌组成功",
        data=SharedDeckResponse.model_validate(item),
    )


@router.delete("/{shared_deck_id}", response_model=BaseResponse[None])
async def delete_shared_deck(
    shared_deck_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """删除共享牌组（需要登录且是作者）"""
    service = SharedDeckService(db)
    await service.delete_shared_deck(shared_deck_id, current_user.id)
    return BaseResponse(success=True, code=200, msg="删除共享牌组成功", data=None)




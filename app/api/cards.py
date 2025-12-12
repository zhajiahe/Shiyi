"""
卡片 API 路由

提供 Card 的查询和更新操作
"""

from fastapi import APIRouter, Depends, Query

from app.core.deps import CurrentUser, DBSession
from app.models.base import BasePageQuery, BaseResponse, PageResponse
from app.schemas.note import (
    CardListQuery,
    CardResponse,
    CardUpdate,
)
from app.services.note import CardService

router = APIRouter(prefix="/cards", tags=["cards"])


@router.get("", response_model=BaseResponse[PageResponse[CardResponse]])
async def get_cards(
    db: DBSession,
    current_user: CurrentUser,
    page_query: BasePageQuery = Depends(),
    query_params: CardListQuery = Depends(),
):
    """获取卡片列表（分页）"""
    service = CardService(db)
    items, total = await service.get_cards(
        user_id=current_user.id,
        query_params=query_params,
        page_num=page_query.page_num,
        page_size=page_query.page_size,
    )
    return BaseResponse(
        success=True,
        code=200,
        msg="获取卡片列表成功",
        data=PageResponse(
            page_num=page_query.page_num,
            page_size=page_query.page_size,
            total=total,
            items=[CardResponse.model_validate(item) for item in items],
        ),
    )


@router.get("/due", response_model=BaseResponse[list[CardResponse]])
async def get_due_cards(
    db: DBSession,
    current_user: CurrentUser,
    deck_id: str | None = Query(default=None, description="牌组ID"),
    due_before: int | None = Query(default=None, description="到期时间之前（时间戳）"),
    limit: int = Query(default=100, ge=1, le=500, description="返回数量限制"),
):
    """获取待复习的卡片"""
    service = CardService(db)
    items = await service.get_due_cards(
        user_id=current_user.id,
        deck_id=deck_id,
        due_before=due_before,
        limit=limit,
    )
    return BaseResponse(
        success=True,
        code=200,
        msg="获取待复习卡片成功",
        data=[CardResponse.model_validate(item) for item in items],
    )


@router.get("/stats", response_model=BaseResponse[dict[str, int]])
async def get_card_stats(
    db: DBSession,
    current_user: CurrentUser,
    deck_id: str | None = Query(default=None, description="牌组ID"),
):
    """获取卡片统计"""
    service = CardService(db)
    stats = await service.get_stats(current_user.id, deck_id)
    return BaseResponse(
        success=True,
        code=200,
        msg="获取卡片统计成功",
        data=stats,
    )


@router.get("/{card_id}", response_model=BaseResponse[CardResponse])
async def get_card(
    card_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """获取单个卡片详情"""
    service = CardService(db)
    item = await service.get_card(card_id, current_user.id)
    return BaseResponse(
        success=True,
        code=200,
        msg="获取卡片成功",
        data=CardResponse.model_validate(item),
    )


@router.put("/{card_id}", response_model=BaseResponse[CardResponse])
async def update_card(
    card_id: str,
    data: CardUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """更新卡片（主要用于调度状态更新）"""
    service = CardService(db)
    item = await service.update_card(card_id, current_user.id, data)
    return BaseResponse(
        success=True,
        code=200,
        msg="更新卡片成功",
        data=CardResponse.model_validate(item),
    )


@router.post("/{card_id}/suspend", response_model=BaseResponse[CardResponse])
async def suspend_card(
    card_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """暂停卡片"""
    service = CardService(db)
    item = await service.suspend_card(card_id, current_user.id)
    return BaseResponse(
        success=True,
        code=200,
        msg="暂停卡片成功",
        data=CardResponse.model_validate(item),
    )


@router.post("/{card_id}/unsuspend", response_model=BaseResponse[CardResponse])
async def unsuspend_card(
    card_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """恢复卡片"""
    service = CardService(db)
    item = await service.unsuspend_card(card_id, current_user.id)
    return BaseResponse(
        success=True,
        code=200,
        msg="恢复卡片成功",
        data=CardResponse.model_validate(item),
    )




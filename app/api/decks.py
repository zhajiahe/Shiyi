"""
牌组 API 路由

提供 Deck 的 CRUD 操作
"""

from fastapi import APIRouter, Depends, status

from app.core.deps import CurrentUser, DBSession
from app.models.base import BasePageQuery, BaseResponse, PageResponse
from app.schemas.deck import (
    DeckCreate,
    DeckListQuery,
    DeckResponse,
    DeckTreeNode,
    DeckUpdate,
)
from app.services.deck import DeckService

router = APIRouter(prefix="/decks", tags=["decks"])


def _deck_to_tree_node(deck) -> DeckTreeNode:
    """递归转换牌组为树节点"""
    children = []
    if hasattr(deck, "children") and deck.children:
        children = [_deck_to_tree_node(child) for child in deck.children if child.deleted_at is None]
    return DeckTreeNode(
        id=deck.id,
        user_id=deck.user_id,
        name=deck.name,
        parent_id=deck.parent_id,
        note_model_id=deck.note_model_id,
        config=deck.config,
        scheduler=deck.scheduler,
        description=deck.description,
        created_at=deck.created_at,
        updated_at=deck.updated_at,
        children=children,
    )


@router.get("", response_model=BaseResponse[PageResponse[DeckResponse]])
async def get_decks(
    db: DBSession,
    current_user: CurrentUser,
    page_query: BasePageQuery = Depends(),
    query_params: DeckListQuery = Depends(),
):
    """获取牌组列表（分页）"""
    service = DeckService(db)
    items, total = await service.get_decks(
        user_id=current_user.id,
        query_params=query_params,
        page_num=page_query.page_num,
        page_size=page_query.page_size,
    )
    return BaseResponse(
        success=True,
        code=200,
        msg="获取牌组列表成功",
        data=PageResponse(
            page_num=page_query.page_num,
            page_size=page_query.page_size,
            total=total,
            items=[DeckResponse.model_validate(item) for item in items],
        ),
    )


@router.get("/tree", response_model=BaseResponse[list[DeckTreeNode]])
async def get_deck_tree(
    db: DBSession,
    current_user: CurrentUser,
):
    """获取牌组树（所有层级）"""
    service = DeckService(db)
    items = await service.get_deck_tree(current_user.id)
    return BaseResponse(
        success=True,
        code=200,
        msg="获取牌组树成功",
        data=[_deck_to_tree_node(item) for item in items],
    )


@router.get("/{deck_id}", response_model=BaseResponse[DeckResponse])
async def get_deck(
    deck_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """获取单个牌组详情"""
    service = DeckService(db)
    item = await service.get_deck(deck_id, current_user.id)
    return BaseResponse(
        success=True,
        code=200,
        msg="获取牌组成功",
        data=DeckResponse.model_validate(item),
    )


@router.post("", response_model=BaseResponse[DeckResponse], status_code=status.HTTP_201_CREATED)
async def create_deck(
    data: DeckCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """创建牌组"""
    service = DeckService(db)
    item = await service.create_deck(current_user.id, data)
    return BaseResponse(
        success=True,
        code=201,
        msg="创建牌组成功",
        data=DeckResponse.model_validate(item),
    )


@router.put("/{deck_id}", response_model=BaseResponse[DeckResponse])
async def update_deck(
    deck_id: str,
    data: DeckUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """更新牌组"""
    service = DeckService(db)
    item = await service.update_deck(deck_id, current_user.id, data)
    return BaseResponse(
        success=True,
        code=200,
        msg="更新牌组成功",
        data=DeckResponse.model_validate(item),
    )


@router.delete("/{deck_id}", response_model=BaseResponse[None])
async def delete_deck(
    deck_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """删除牌组（软删除）"""
    service = DeckService(db)
    await service.delete_deck(deck_id, current_user.id)
    return BaseResponse(success=True, code=200, msg="删除牌组成功", data=None)




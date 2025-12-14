"""
管理员 API 路由

提供系统管理员专用接口
"""

from fastapi import APIRouter

from app.core.deps import CurrentSuperUser, DBSession
from app.models.base import BaseResponse
from app.schemas.shared_deck import SharedDeckResponse
from app.services.shared_deck import SharedDeckService

router = APIRouter(prefix="/admin", tags=["admin"])


# ==================== 共享牌组管理 ====================


@router.put("/shared-decks/{shared_deck_id}/feature", response_model=BaseResponse[SharedDeckResponse])
async def toggle_featured(
    shared_deck_id: str,
    featured: bool,
    db: DBSession,
    _current_user: CurrentSuperUser,
):
    """
    设置/取消精选牌组

    Args:
        shared_deck_id: 共享牌组 ID
        featured: 是否精选
    """
    service = SharedDeckService(db)
    item = await service.set_featured(shared_deck_id, featured)
    return BaseResponse(
        success=True,
        code=200,
        msg=f"{'设置为精选' if featured else '取消精选'}成功",
        data=SharedDeckResponse.model_validate(item),
    )


@router.put("/shared-decks/{shared_deck_id}/official", response_model=BaseResponse[SharedDeckResponse])
async def toggle_official(
    shared_deck_id: str,
    official: bool,
    db: DBSession,
    _current_user: CurrentSuperUser,
):
    """
    设置/取消官方推荐

    Args:
        shared_deck_id: 共享牌组 ID
        official: 是否官方推荐
    """
    service = SharedDeckService(db)
    item = await service.set_official(shared_deck_id, official)
    return BaseResponse(
        success=True,
        code=200,
        msg=f"{'设置为官方推荐' if official else '取消官方推荐'}成功",
        data=SharedDeckResponse.model_validate(item),
    )


@router.put("/shared-decks/{shared_deck_id}/active", response_model=BaseResponse[SharedDeckResponse])
async def toggle_active(
    shared_deck_id: str,
    active: bool,
    db: DBSession,
    _current_user: CurrentSuperUser,
):
    """
    上架/下架共享牌组

    Args:
        shared_deck_id: 共享牌组 ID
        active: 是否上架
    """
    service = SharedDeckService(db)
    item = await service.set_active(shared_deck_id, active)
    return BaseResponse(
        success=True,
        code=200,
        msg=f"{'上架' if active else '下架'}成功",
        data=SharedDeckResponse.model_validate(item),
    )


# ==================== 系统统计 ====================


@router.get("/stats", response_model=BaseResponse[dict])
async def get_system_stats(
    db: DBSession,
    _current_user: CurrentSuperUser,
):
    """
    获取系统统计数据

    返回：
    - 用户总数
    - 共享牌组总数
    - 笔记类型总数
    - 总下载次数
    """
    from sqlalchemy import func, select

    from app.models.note_model import NoteModel
    from app.models.shared_deck import SharedDeck
    from app.models.user import User

    # 用户统计
    users_result = await db.execute(select(func.count()).select_from(User).where(User.deleted_at.is_(None)))
    user_count = users_result.scalar() or 0

    # 共享牌组统计
    shared_decks_result = await db.execute(
        select(func.count()).select_from(SharedDeck).where(SharedDeck.deleted_at.is_(None))
    )
    shared_deck_count = shared_decks_result.scalar() or 0

    # 活跃共享牌组
    active_result = await db.execute(
        select(func.count())
        .select_from(SharedDeck)
        .where(SharedDeck.deleted_at.is_(None), SharedDeck.is_active.is_(True))
    )
    active_count = active_result.scalar() or 0

    # 笔记类型统计
    note_models_result = await db.execute(
        select(func.count()).select_from(NoteModel).where(NoteModel.deleted_at.is_(None))
    )
    note_model_count = note_models_result.scalar() or 0

    # 总下载次数
    downloads_result = await db.execute(
        select(func.sum(SharedDeck.download_count)).select_from(SharedDeck).where(SharedDeck.deleted_at.is_(None))
    )
    total_downloads = downloads_result.scalar() or 0

    return BaseResponse(
        success=True,
        code=200,
        msg="获取系统统计成功",
        data={
            "user_count": user_count,
            "shared_deck_count": shared_deck_count,
            "active_shared_deck_count": active_count,
            "note_model_count": note_model_count,
            "total_downloads": total_downloads,
        },
    )

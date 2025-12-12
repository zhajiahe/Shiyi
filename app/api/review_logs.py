"""
复习日志 API 路由

提供 ReviewLog 的创建和查询操作
"""

from fastapi import APIRouter, Depends, status

from app.core.deps import CurrentUser, DBSession
from app.models.base import BasePageQuery, BaseResponse, PageResponse
from app.schemas.review_log import (
    ReviewLogCreate,
    ReviewLogListQuery,
    ReviewLogResponse,
    ReviewStats,
)
from app.services.review_log import ReviewLogService

router = APIRouter(prefix="/review-logs", tags=["review-logs"])


@router.get("", response_model=BaseResponse[PageResponse[ReviewLogResponse]])
async def get_review_logs(
    db: DBSession,
    current_user: CurrentUser,
    page_query: BasePageQuery = Depends(),
    query_params: ReviewLogListQuery = Depends(),
):
    """获取复习日志列表（分页）"""
    service = ReviewLogService(db)
    items, total = await service.get_review_logs(
        user_id=current_user.id,
        query_params=query_params,
        page_num=page_query.page_num,
        page_size=page_query.page_size,
    )
    return BaseResponse(
        success=True,
        code=200,
        msg="获取复习日志列表成功",
        data=PageResponse(
            page_num=page_query.page_num,
            page_size=page_query.page_size,
            total=total,
            items=[ReviewLogResponse.model_validate(item) for item in items],
        ),
    )


@router.get("/stats", response_model=BaseResponse[ReviewStats])
async def get_review_stats(
    db: DBSession,
    current_user: CurrentUser,
):
    """获取复习统计"""
    service = ReviewLogService(db)
    stats = await service.get_stats(current_user.id)
    return BaseResponse(
        success=True,
        code=200,
        msg="获取复习统计成功",
        data=ReviewStats(**stats),
    )


@router.get("/{log_id}", response_model=BaseResponse[ReviewLogResponse])
async def get_review_log(
    log_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """获取单个复习日志详情"""
    service = ReviewLogService(db)
    item = await service.get_review_log(log_id, current_user.id)
    return BaseResponse(
        success=True,
        code=200,
        msg="获取复习日志成功",
        data=ReviewLogResponse.model_validate(item),
    )


@router.post("", response_model=BaseResponse[ReviewLogResponse], status_code=status.HTTP_201_CREATED)
async def create_review_log(
    data: ReviewLogCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """创建复习日志"""
    service = ReviewLogService(db)
    item = await service.create_review_log(current_user.id, data)
    return BaseResponse(
        success=True,
        code=201,
        msg="创建复习日志成功",
        data=ReviewLogResponse.model_validate(item),
    )




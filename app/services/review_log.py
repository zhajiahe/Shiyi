"""
复习日志服务

处理 ReviewLog 相关的业务逻辑
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.review_log import ReviewLog
from app.repositories.note import CardRepository
from app.repositories.review_log import ReviewLogRepository
from app.schemas.review_log import ReviewLogCreate, ReviewLogListQuery


class ReviewLogService:
    """复习日志服务类"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.review_log_repo = ReviewLogRepository(db)
        self.card_repo = CardRepository(db)

    async def get_review_log(self, log_id: str, user_id: str) -> ReviewLog:
        """
        获取单个复习日志

        Args:
            log_id: 日志 ID
            user_id: 当前用户 ID

        Returns:
            ReviewLog 实例
        """
        log = await self.review_log_repo.get_by_id(log_id)
        if not log:
            raise NotFoundException(msg="复习日志不存在")
        if log.user_id != user_id:
            raise ForbiddenException(msg="无权限访问此复习日志")
        return log

    async def get_review_logs(
        self,
        user_id: str,
        query_params: ReviewLogListQuery,
        page_num: int = 1,
        page_size: int = 10,
    ) -> tuple[list[ReviewLog], int]:
        """
        获取复习日志列表

        Args:
            user_id: 用户 ID
            query_params: 查询参数
            page_num: 页码
            page_size: 每页数量

        Returns:
            (复习日志列表, 总数) 元组
        """
        skip = (page_num - 1) * page_size
        return await self.review_log_repo.get_by_user_id(
            user_id=user_id,
            card_id=query_params.card_id,
            start_time=query_params.start_time,
            end_time=query_params.end_time,
            skip=skip,
            limit=page_size,
        )

    async def create_review_log(self, user_id: str, data: ReviewLogCreate) -> ReviewLog:
        """
        创建复习日志

        Args:
            user_id: 用户 ID
            data: 创建数据

        Returns:
            创建的 ReviewLog 实例
        """
        # 验证卡片所属
        card = await self.card_repo.get_by_id(data.card_id)
        if not card:
            raise NotFoundException(msg="卡片不存在")
        if card.user_id != user_id:
            raise ForbiddenException(msg="无权限访问此卡片")

        # 创建日志
        return await self.review_log_repo.create(
            {
                "user_id": user_id,
                "card_id": data.card_id,
                "review_time": data.review_time,
                "rating": data.rating,
                "prev_state": data.prev_state,
                "new_state": data.new_state,
                "prev_interval": data.prev_interval,
                "new_interval": data.new_interval,
                "prev_ease_factor": data.prev_ease_factor,
                "new_ease_factor": data.new_ease_factor,
                "prev_due": data.prev_due,
                "new_due": data.new_due,
                "prev_stability": data.prev_stability,
                "new_stability": data.new_stability,
                "prev_difficulty": data.prev_difficulty,
                "new_difficulty": data.new_difficulty,
                "duration_ms": data.duration_ms,
            }
        )

    async def get_stats(self, user_id: str) -> dict:
        """
        获取复习统计

        Args:
            user_id: 用户 ID

        Returns:
            统计数据
        """
        return await self.review_log_repo.get_stats(user_id)

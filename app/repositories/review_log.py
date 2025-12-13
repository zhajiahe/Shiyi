"""
复习日志 Repository

封装 ReviewLog 相关的数据库操作
"""

from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.review_log import ReviewLog
from app.repositories.base import BaseRepository


class ReviewLogRepository(BaseRepository[ReviewLog]):
    """复习日志数据访问层"""

    def __init__(self, db: AsyncSession):
        super().__init__(ReviewLog, db)

    async def get_by_user_id(
        self,
        user_id: str,
        *,
        card_id: str | None = None,
        start_time: int | None = None,
        end_time: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[ReviewLog], int]:
        """
        获取用户的复习日志列表

        Args:
            user_id: 用户 ID
            card_id: 卡片 ID
            start_time: 开始时间（毫秒）
            end_time: 结束时间（毫秒）
            skip: 跳过的记录数
            limit: 返回的最大记录数

        Returns:
            (复习日志列表, 总数) 元组
        """
        # 基础查询
        query = select(ReviewLog).where(
            ReviewLog.user_id == user_id,
            ReviewLog.deleted_at.is_(None),
        )
        count_query = (
            select(func.count())
            .select_from(ReviewLog)
            .where(
                ReviewLog.user_id == user_id,
                ReviewLog.deleted_at.is_(None),
            )
        )

        # 卡片过滤
        if card_id:
            query = query.where(ReviewLog.card_id == card_id)
            count_query = count_query.where(ReviewLog.card_id == card_id)

        # 时间范围过滤
        if start_time is not None:
            query = query.where(ReviewLog.review_time >= start_time)
            count_query = count_query.where(ReviewLog.review_time >= start_time)
        if end_time is not None:
            query = query.where(ReviewLog.review_time <= end_time)
            count_query = count_query.where(ReviewLog.review_time <= end_time)

        # 获取总数
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # 分页查询
        query = query.order_by(ReviewLog.review_time.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def get_stats(self, user_id: str) -> dict:
        """
        获取复习统计

        Args:
            user_id: 用户 ID

        Returns:
            统计数据
        """
        today_start = int(datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).timestamp() * 1000)
        week_start = int(
            (datetime.now() - timedelta(days=datetime.now().weekday()))
            .replace(hour=0, minute=0, second=0, microsecond=0)
            .timestamp()
            * 1000
        )

        # 总复习次数
        total_result = await self.db.execute(
            select(func.count())
            .select_from(ReviewLog)
            .where(
                ReviewLog.user_id == user_id,
                ReviewLog.deleted_at.is_(None),
            )
        )
        total_reviews = total_result.scalar() or 0

        # 今日复习次数
        today_result = await self.db.execute(
            select(func.count())
            .select_from(ReviewLog)
            .where(
                ReviewLog.user_id == user_id,
                ReviewLog.deleted_at.is_(None),
                ReviewLog.review_time >= today_start,
            )
        )
        reviews_today = today_result.scalar() or 0

        # 本周复习次数
        week_result = await self.db.execute(
            select(func.count())
            .select_from(ReviewLog)
            .where(
                ReviewLog.user_id == user_id,
                ReviewLog.deleted_at.is_(None),
                ReviewLog.review_time >= week_start,
            )
        )
        reviews_this_week = week_result.scalar() or 0

        # 平均评分
        avg_result = await self.db.execute(
            select(func.avg(ReviewLog.rating)).where(
                ReviewLog.user_id == user_id,
                ReviewLog.deleted_at.is_(None),
            )
        )
        average_rating = avg_result.scalar() or 0.0

        # 记忆保持率（Good/Easy 比例）
        good_easy_result = await self.db.execute(
            select(func.count())
            .select_from(ReviewLog)
            .where(
                ReviewLog.user_id == user_id,
                ReviewLog.deleted_at.is_(None),
                ReviewLog.rating >= 3,
            )
        )
        good_easy_count = good_easy_result.scalar() or 0
        retention_rate = (good_easy_count / total_reviews * 100) if total_reviews > 0 else 0.0

        return {
            "total_reviews": total_reviews,
            "reviews_today": reviews_today,
            "reviews_this_week": reviews_this_week,
            "average_rating": round(float(average_rating), 2),
            "retention_rate": round(retention_rate, 2),
        }

"""
复习日志相关的 Pydantic Schema

用于 API 请求和响应的数据验证和序列化
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ReviewLogCreate(BaseModel):
    """创建复习日志请求"""

    card_id: str = Field(..., description="卡片ID")
    review_time: int = Field(..., description="复习时间戳（毫秒）")
    rating: Literal[1, 2, 3, 4] = Field(..., description="用户评分: 1=Again, 2=Hard, 3=Good, 4=Easy")

    # 调度状态变化
    prev_state: str | None = Field(default=None, description="复习前状态")
    new_state: str | None = Field(default=None, description="复习后状态")
    prev_interval: int | None = Field(default=None, description="复习前间隔（天）")
    new_interval: int | None = Field(default=None, description="复习后间隔（天）")
    prev_ease_factor: int | None = Field(default=None, description="复习前难度系数")
    new_ease_factor: int | None = Field(default=None, description="复习后难度系数")
    prev_due: int | None = Field(default=None, description="复习前到期时间")
    new_due: int | None = Field(default=None, description="复习后到期时间")

    # FSRS 相关
    prev_stability: float | None = Field(default=None, description="复习前稳定性")
    new_stability: float | None = Field(default=None, description="复习后稳定性")
    prev_difficulty: float | None = Field(default=None, description="复习前难度")
    new_difficulty: float | None = Field(default=None, description="复习后难度")

    # 复习时长
    duration_ms: int | None = Field(default=None, ge=0, description="本次回答耗时（毫秒）")


class ReviewLogResponse(BaseModel):
    """复习日志响应"""

    id: str = Field(..., description="日志ID")
    user_id: str = Field(..., description="用户ID")
    card_id: str = Field(..., description="卡片ID")
    review_time: int = Field(..., description="复习时间戳（毫秒）")
    rating: int = Field(..., description="用户评分")

    prev_state: str | None = Field(default=None, description="复习前状态")
    new_state: str | None = Field(default=None, description="复习后状态")
    prev_interval: int | None = Field(default=None, description="复习前间隔")
    new_interval: int | None = Field(default=None, description="复习后间隔")
    prev_ease_factor: int | None = Field(default=None, description="复习前难度系数")
    new_ease_factor: int | None = Field(default=None, description="复习后难度系数")

    prev_stability: float | None = Field(default=None, description="复习前稳定性")
    new_stability: float | None = Field(default=None, description="复习后稳定性")
    prev_difficulty: float | None = Field(default=None, description="复习前难度")
    new_difficulty: float | None = Field(default=None, description="复习后难度")

    duration_ms: int | None = Field(default=None, description="回答耗时（毫秒）")
    created_at: datetime | None = Field(default=None, description="创建时间")

    model_config = {"from_attributes": True}


class ReviewLogListQuery(BaseModel):
    """复习日志列表查询参数"""

    card_id: str | None = Field(default=None, description="卡片ID")
    start_time: int | None = Field(default=None, description="开始时间（毫秒）")
    end_time: int | None = Field(default=None, description="结束时间（毫秒）")


class ReviewStats(BaseModel):
    """复习统计"""

    total_reviews: int = Field(..., description="总复习次数")
    reviews_today: int = Field(..., description="今日复习次数")
    reviews_this_week: int = Field(..., description="本周复习次数")
    average_rating: float = Field(..., description="平均评分")
    retention_rate: float = Field(..., description="记忆保持率（Good/Easy 比例）")




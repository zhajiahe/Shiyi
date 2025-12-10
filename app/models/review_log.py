from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseTableMixin


class ReviewLog(Base, BaseTableMixin):
    """复习日志"""

    __tablename__ = "review_logs"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="用户ID"
    )
    card_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, comment="卡片ID"
    )
    review_time: Mapped[DateTime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), comment="复习时间"
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False, comment="评分(1-4)")

    prev_interval: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="复习前间隔")
    new_interval: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="复习后间隔")
    prev_ease_factor: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="复习前难度系数")
    new_ease_factor: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="复习后难度系数")
    prev_due: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True, comment="复习前到期时间")
    new_due: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True, comment="复习后到期时间")
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="本次回答耗时ms")

    __table_args__ = (
        Index("idx_review_logs_user_id", "user_id"),
        Index("idx_review_logs_card_id", "card_id"),
        Index("idx_review_logs_review_time", "review_time"),
    )

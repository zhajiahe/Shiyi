"""
复习日志（ReviewLog）模型

记录每次复习的详细信息，用于统计和分析
"""

from sqlalchemy import BigInteger, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseTableMixin


class ReviewLog(Base, BaseTableMixin):
    """复习日志模型 - 记录每次复习"""

    __tablename__ = "review_logs"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True, comment="所属用户ID"
    )
    card_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cards.id"), nullable=False, index=True, comment="所属卡片ID"
    )
    review_time: Mapped[int] = mapped_column(
        BigInteger, nullable=False, index=True, comment="复习时间戳（毫秒）"
    )
    rating: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="用户评分: 1=Again, 2=Hard, 3=Good, 4=Easy"
    )

    # 调度状态变化
    prev_state: Mapped[str | None] = mapped_column(
        String(20), nullable=True, comment="复习前状态"
    )
    new_state: Mapped[str | None] = mapped_column(
        String(20), nullable=True, comment="复习后状态"
    )
    prev_interval: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="复习前间隔（天）"
    )
    new_interval: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="复习后间隔（天）"
    )
    prev_ease_factor: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="复习前难度系数"
    )
    new_ease_factor: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="复习后难度系数"
    )
    prev_due: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, comment="复习前到期时间"
    )
    new_due: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, comment="复习后到期时间"
    )

    # FSRS 相关
    prev_stability: Mapped[float | None] = mapped_column(
        nullable=True, comment="复习前稳定性"
    )
    new_stability: Mapped[float | None] = mapped_column(
        nullable=True, comment="复习后稳定性"
    )
    prev_difficulty: Mapped[float | None] = mapped_column(
        nullable=True, comment="复习前难度"
    )
    new_difficulty: Mapped[float | None] = mapped_column(
        nullable=True, comment="复习后难度"
    )

    # 复习时长
    duration_ms: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="本次回答耗时（毫秒）"
    )

    def __repr__(self) -> str:
        return f"<ReviewLog(id={self.id}, card_id={self.card_id}, rating={self.rating})>"




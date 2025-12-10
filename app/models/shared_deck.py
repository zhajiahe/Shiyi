from sqlalchemy import JSON, Boolean, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseTableMixin


class SharedDeck(Base, BaseTableMixin):
    """牌组市场条目"""

    __tablename__ = "shared_decks"

    owner_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, comment="拥有者用户ID"
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False, comment="名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="描述")
    language: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="语言")
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list, comment="标签(JSON数组)")
    cover_image_url: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="封面图")
    version: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="版本")
    stats: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict, comment="统计数据(JSON)")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, comment="是否上架")

    __table_args__ = (
        Index("idx_shared_decks_owner_user_id", "owner_user_id"),
        Index("idx_shared_decks_is_active", "is_active"),
        Index("idx_shared_decks_language", "language"),
    )

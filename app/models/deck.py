from sqlalchemy import JSON, Boolean, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseTableMixin


class Deck(Base, BaseTableMixin):
    """牌组"""

    __tablename__ = "decks"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="所属用户"
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="牌组名称")
    parent_deck_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("decks.id", ondelete="SET NULL"), nullable=True, comment="父牌组ID"
    )
    note_model_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("note_models.id", ondelete="SET NULL"), nullable=True, comment="绑定的笔记类型(叶子节点)"
    )
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict, comment="调度配置(JSON)")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, comment="是否有效")

    __table_args__ = (
        Index("idx_decks_user_id", "user_id"),
        Index("idx_decks_parent_deck_id", "parent_deck_id"),
        Index("idx_decks_note_model_id", "note_model_id"),
        UniqueConstraint("user_id", "parent_deck_id", "name", name="uq_decks_user_parent_name"),
    )

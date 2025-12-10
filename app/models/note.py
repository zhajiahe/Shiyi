from sqlalchemy import JSON, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseTableMixin


class Note(Base, BaseTableMixin):
    """笔记（抽象知识单位）"""

    __tablename__ = "notes"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="所属用户"
    )
    deck_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("decks.id", ondelete="CASCADE"), nullable=False, comment="所属牌组"
    )
    note_model_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("note_models.id", ondelete="CASCADE"), nullable=False, comment="笔记类型"
    )
    fields: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict, comment="字段内容(JSON)")
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list, comment="标签列表(JSON数组)")
    source_type: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="来源类型")
    source_meta: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict, comment="来源元数据(JSON)")

    __table_args__ = (
        Index("idx_notes_user_id", "user_id"),
        Index("idx_notes_deck_id", "deck_id"),
        Index("idx_notes_note_model_id", "note_model_id"),
    )

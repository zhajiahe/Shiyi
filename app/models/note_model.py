from sqlalchemy import JSON, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseTableMixin


class NoteModel(Base, BaseTableMixin):
    """笔记类型（定义字段结构和样式）"""

    __tablename__ = "note_models"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="创建者用户ID"
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="笔记类型名称")
    fields_schema: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict, comment="字段结构定义(JSON)")
    css: Mapped[str | None] = mapped_column(Text, nullable=True, comment="样式定义")

    __table_args__ = (Index("idx_note_models_user_id", "user_id"),)

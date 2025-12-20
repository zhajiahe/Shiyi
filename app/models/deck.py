"""
牌组（Deck）模型
"""

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseTableMixin


class Deck(Base, BaseTableMixin):
    """牌组模型"""

    __tablename__ = "decks"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True, comment="所属用户ID"
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="牌组名称")
    note_model_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("note_models.id"), nullable=True, index=True, comment="绑定的笔记类型ID"
    )
    description: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="牌组描述")
    published_deck_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("shared_decks.id"), nullable=True, index=True, comment="关联的已发布牌组ID"
    )

    # 关系
    published_deck = relationship("SharedDeck", foreign_keys=[published_deck_id])

    def __repr__(self) -> str:
        return f"<Deck(id={self.id}, name={self.name})>"

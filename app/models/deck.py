"""
牌组（Deck）模型

支持树形结构，每个牌组可以有父牌组
"""

from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseTableMixin


class Deck(Base, BaseTableMixin):
    """牌组模型 - 支持树形结构"""

    __tablename__ = "decks"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True, comment="所属用户ID"
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="牌组名称")
    parent_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("decks.id"), nullable=True, index=True, comment="父牌组ID"
    )
    note_model_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("note_models.id"), nullable=True, index=True, comment="绑定的笔记类型ID"
    )
    config: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        comment="牌组配置（每日新卡数、复习数、学习步骤等）",
    )
    scheduler: Mapped[str] = mapped_column(
        String(20), nullable=False, default="sm2", comment="调度算法: sm2, fsrs_v4, fsrs_v5"
    )
    description: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="牌组描述")

    # 关系 - 自引用
    parent: Mapped["Deck | None"] = relationship(
        "Deck", remote_side="Deck.id", back_populates="children", lazy="selectin"
    )
    children: Mapped[list["Deck"]] = relationship("Deck", back_populates="parent", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Deck(id={self.id}, name={self.name})>"

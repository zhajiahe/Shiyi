"""
笔记（Note）模型

Note 是抽象知识单位，包含字段内容
"""

from sqlalchemy import JSON, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseTableMixin


class Note(Base, BaseTableMixin):
    """笔记模型 - 存储知识内容"""

    __tablename__ = "notes"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True, comment="所属用户ID"
    )
    deck_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("decks.id"), nullable=False, index=True, comment="所属牌组ID"
    )
    note_model_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("note_models.id"), nullable=False, index=True, comment="笔记类型ID"
    )
    guid: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True, comment="语义唯一标识（用于共享牌组去重）"
    )
    fields: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        comment="字段内容，如 {'Front': 'apple', 'Back': '苹果'}",
    )
    tags: Mapped[list] = mapped_column(
        JSON, nullable=False, default=list, comment="标签列表"
    )
    source_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="manual", comment="来源类型: manual, ai, import"
    )
    source_meta: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, comment="来源元数据（AI 提示词、导入来源等）"
    )
    dirty: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="是否有待同步变更: 0=否, 1=是"
    )

    # 关系
    cards: Mapped[list["Card"]] = relationship(
        "Card", back_populates="note", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Note(id={self.id}, guid={self.guid})>"


class Card(Base, BaseTableMixin):
    """卡片模型 - 面向复习的具体单位"""

    __tablename__ = "cards"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True, comment="所属用户ID"
    )
    note_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("notes.id"), nullable=False, index=True, comment="所属笔记ID"
    )
    deck_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("decks.id"), nullable=False, index=True, comment="所属牌组ID"
    )
    card_template_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("card_templates.id"), nullable=False, index=True, comment="卡片模板ID"
    )
    ord: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="模板序号（冗余字段）"
    )

    # 调度状态
    state: Mapped[str] = mapped_column(
        String(20), nullable=False, default="new", comment="状态: new, learning, review, relearning"
    )
    queue: Mapped[str] = mapped_column(
        String(20), nullable=False, default="new", comment="队列: new, learning, review, suspended"
    )
    due: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="下次复习时间戳或天编号"
    )
    interval: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="当前间隔（天）"
    )
    ease_factor: Mapped[int] = mapped_column(
        Integer, nullable=False, default=2500, comment="难度系数（2500=2.5）"
    )
    reps: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="复习次数"
    )
    lapses: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="遗忘次数"
    )
    last_review: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="上次复习时间戳"
    )

    # FSRS 专用字段
    stability: Mapped[float] = mapped_column(
        nullable=False, default=0.0, comment="FSRS 稳定性"
    )
    difficulty: Mapped[float] = mapped_column(
        nullable=False, default=0.0, comment="FSRS 难度"
    )

    dirty: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="是否有待同步变更: 0=否, 1=是"
    )

    # 关系
    note: Mapped["Note"] = relationship("Note", back_populates="cards")

    def __repr__(self) -> str:
        return f"<Card(id={self.id}, state={self.state}, due={self.due})>"




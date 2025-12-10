from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseTableMixin


class Card(Base, BaseTableMixin):
    """卡片（含调度信息）"""

    __tablename__ = "cards"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="所属用户"
    )
    note_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, comment="笔记ID"
    )
    deck_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("decks.id", ondelete="CASCADE"), nullable=False, comment="牌组ID"
    )
    card_template_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("card_templates.id", ondelete="CASCADE"), nullable=False, comment="模板ID"
    )
    ord: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="模板序号(冗余)")

    # 调度状态
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="new", comment="类型:new/learning/review等")
    queue: Mapped[str] = mapped_column(String(20), nullable=False, default="new", comment="队列")
    interval: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="间隔(天)")
    ease_factor: Mapped[int] = mapped_column(Integer, nullable=False, default=2500, comment="记忆难度系数*1000")
    due: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True, comment="下次复习时间")
    reps: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="复习次数")
    lapses: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="遗忘次数")

    __table_args__ = (
        Index("idx_cards_user_id", "user_id"),
        Index("idx_cards_deck_id", "deck_id"),
        Index("idx_cards_note_id", "note_id"),
        Index("idx_cards_card_template_id", "card_template_id"),
        Index("idx_cards_due", "due"),
        Index("idx_cards_note_template", "note_id", "card_template_id"),
    )

from sqlalchemy import ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseTableMixin


class CardTemplate(Base, BaseTableMixin):
    """卡片模板（与笔记类型关联）"""

    __tablename__ = "card_templates"

    note_model_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("note_models.id", ondelete="CASCADE"), nullable=False, comment="所属笔记类型"
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="模板名称")
    ord: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="模板序号(从0开始)")
    question_template: Mapped[str] = mapped_column(Text, nullable=False, comment="问题侧HTML模板")
    answer_template: Mapped[str] = mapped_column(Text, nullable=False, comment="答案侧HTML模板")

    __table_args__ = (
        Index("idx_card_templates_note_model_id", "note_model_id"),
        UniqueConstraint("note_model_id", "ord", name="uq_card_template_model_ord"),
    )

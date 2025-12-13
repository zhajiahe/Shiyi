"""
笔记类型（NoteModel）和卡片模板（CardTemplate）模型

NoteModel 定义字段结构，CardTemplate 定义问答模板
"""

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseTableMixin


class NoteModel(Base, BaseTableMixin):
    """笔记类型模型 - 定义笔记的字段结构"""

    __tablename__ = "note_models"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True, comment="所属用户ID"
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="笔记类型名称")
    fields_schema: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        comment="字段定义，如 [{'name': 'Front'}, {'name': 'Back'}]",
    )
    css: Mapped[str | None] = mapped_column(Text, nullable=True, comment="自定义CSS样式")

    # 关系
    templates: Mapped[list["CardTemplate"]] = relationship(
        "CardTemplate", back_populates="note_model", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<NoteModel(id={self.id}, name={self.name})>"


class CardTemplate(Base, BaseTableMixin):
    """卡片模板模型 - 定义问答侧的 HTML 模板"""

    __tablename__ = "card_templates"

    note_model_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("note_models.id"), nullable=False, index=True, comment="所属笔记类型ID"
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="模板名称")
    ord: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="模板序号（从0开始）")
    question_template: Mapped[str] = mapped_column(Text, nullable=False, default="{{Front}}", comment="问题侧HTML模板")
    answer_template: Mapped[str] = mapped_column(
        Text, nullable=False, default="{{FrontSide}}<hr>{{Back}}", comment="答案侧HTML模板"
    )

    # 关系
    note_model: Mapped["NoteModel"] = relationship("NoteModel", back_populates="templates")

    def __repr__(self) -> str:
        return f"<CardTemplate(id={self.id}, name={self.name}, ord={self.ord})>"

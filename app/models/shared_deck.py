"""
共享牌组（SharedDeck）模型

用于牌组市场的公开分享
"""

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, BaseTableMixin


class SharedDeck(Base, BaseTableMixin):
    """共享牌组模型 - 牌组市场元数据"""

    __tablename__ = "shared_decks"

    author_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True, comment="作者用户ID"
    )
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True, comment="URL 友好标识")
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="标题")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="描述（Markdown）")
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="zh-CN", comment="语言")
    tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list, comment="标签列表")
    cover_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="封面图片URL")

    # 统计信息
    card_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="卡片数量")
    note_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="笔记数量")
    download_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="下载次数")

    # 版本控制
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, comment="当前版本号")
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, comment="内容哈希")

    # 状态
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment="是否精选")
    is_official: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment="是否官方")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, comment="是否上架")

    # 关系
    snapshots: Mapped[list["SharedDeckSnapshot"]] = relationship(
        "SharedDeckSnapshot", back_populates="shared_deck", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<SharedDeck(id={self.id}, slug={self.slug}, title={self.title})>"


class SharedDeckSnapshot(Base, BaseTableMixin):
    """共享牌组快照模型 - 存储特定版本的内容"""

    __tablename__ = "shared_deck_snapshots"

    shared_deck_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("shared_decks.id"), nullable=False, index=True, comment="共享牌组ID"
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, comment="版本号")
    export_format_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, comment="导出格式版本")
    file_url: Mapped[str] = mapped_column(String(500), nullable=False, comment="文件URL")
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, comment="内容哈希")
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="文件大小（字节）")

    # 关系
    shared_deck: Mapped["SharedDeck"] = relationship("SharedDeck", back_populates="snapshots")

    def __repr__(self) -> str:
        return f"<SharedDeckSnapshot(id={self.id}, version={self.version})>"

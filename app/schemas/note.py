"""
笔记和卡片相关的 Pydantic Schema

用于 API 请求和响应的数据验证和序列化
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# ==================== 卡片 Schema ====================


class CardBase(BaseModel):
    """卡片基础字段"""

    state: Literal["new", "learning", "review", "relearning"] = Field(default="new", description="状态")
    queue: Literal["new", "learning", "review", "suspended"] = Field(default="new", description="队列")
    due: int = Field(default=0, description="下次复习时间戳或天编号")
    interval: int = Field(default=0, ge=0, description="当前间隔（天）")
    ease_factor: int = Field(default=2500, ge=1300, description="难度系数（2500=2.5）")


class CardResponse(CardBase):
    """卡片响应"""

    id: str = Field(..., description="卡片ID")
    user_id: str = Field(..., description="所属用户ID")
    note_id: str = Field(..., description="所属笔记ID")
    deck_id: str = Field(..., description="所属牌组ID")
    card_template_id: str = Field(..., description="卡片模板ID")
    ord: int = Field(default=0, description="模板序号")
    reps: int = Field(default=0, description="复习次数")
    lapses: int = Field(default=0, description="遗忘次数")
    last_review: int | None = Field(default=None, description="上次复习时间戳")
    stability: float = Field(default=0.0, description="FSRS 稳定性")
    difficulty: float = Field(default=0.0, description="FSRS 难度")
    created_at: datetime | None = Field(default=None, description="创建时间")
    updated_at: datetime | None = Field(default=None, description="更新时间")

    model_config = {"from_attributes": True}


class CardUpdate(BaseModel):
    """更新卡片请求（主要用于调度状态更新）"""

    state: Literal["new", "learning", "review", "relearning"] | None = Field(default=None, description="状态")
    queue: Literal["new", "learning", "review", "suspended"] | None = Field(default=None, description="队列")
    due: int | None = Field(default=None, description="下次复习时间戳")
    interval: int | None = Field(default=None, ge=0, description="当前间隔（天）")
    ease_factor: int | None = Field(default=None, ge=1300, description="难度系数")
    reps: int | None = Field(default=None, ge=0, description="复习次数")
    lapses: int | None = Field(default=None, ge=0, description="遗忘次数")
    last_review: int | None = Field(default=None, description="上次复习时间戳")
    stability: float | None = Field(default=None, description="FSRS 稳定性")
    difficulty: float | None = Field(default=None, description="FSRS 难度")


# ==================== 笔记 Schema ====================


class NoteBase(BaseModel):
    """笔记基础字段"""

    deck_id: str = Field(..., description="所属牌组ID")
    note_model_id: str = Field(..., description="笔记类型ID")
    fields: dict[str, str] = Field(..., description="字段内容")
    tags: list[str] = Field(default_factory=list, description="标签列表")


class NoteCreate(NoteBase):
    """创建笔记请求"""

    source_type: Literal["manual", "ai", "import"] = Field(default="manual", description="来源类型")
    source_meta: dict | None = Field(default=None, description="来源元数据")


class NoteUpdate(BaseModel):
    """更新笔记请求"""

    deck_id: str | None = Field(default=None, description="所属牌组ID")
    fields: dict[str, str] | None = Field(default=None, description="字段内容")
    tags: list[str] | None = Field(default=None, description="标签列表")


class NoteResponse(NoteBase):
    """笔记响应"""

    id: str = Field(..., description="笔记ID")
    user_id: str = Field(..., description="所属用户ID")
    guid: str = Field(..., description="语义唯一标识")
    source_type: str = Field(default="manual", description="来源类型")
    source_meta: dict | None = Field(default=None, description="来源元数据")
    cards: list[CardResponse] = Field(default_factory=list, description="关联的卡片")
    created_at: datetime | None = Field(default=None, description="创建时间")
    updated_at: datetime | None = Field(default=None, description="更新时间")

    model_config = {"from_attributes": True}


class NoteListQuery(BaseModel):
    """笔记列表查询参数"""

    deck_id: str | None = Field(default=None, description="牌组ID")
    keyword: str | None = Field(default=None, description="搜索关键词（字段内容）")
    tags: list[str] | None = Field(default=None, description="标签过滤")


class CardListQuery(BaseModel):
    """卡片列表查询参数"""

    deck_id: str | None = Field(default=None, description="牌组ID")
    state: Literal["new", "learning", "review", "relearning"] | None = Field(default=None, description="状态过滤")
    queue: Literal["new", "learning", "review", "suspended"] | None = Field(default=None, description="队列过滤")
    due_before: int | None = Field(default=None, description="到期时间之前")

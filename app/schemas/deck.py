"""
牌组相关的 Pydantic Schema

用于 API 请求和响应的数据验证和序列化
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# ==================== 牌组配置 ====================


class DeckConfig(BaseModel):
    """牌组配置"""

    new_per_day: int = Field(default=20, ge=0, description="每日新卡数量")
    max_reviews_per_day: int = Field(default=200, ge=0, description="每日最大复习数量")
    learning_steps: list[int] = Field(default_factory=lambda: [1, 10], description="学习步骤（分钟）")
    graduating_interval: int = Field(default=1, ge=1, description="毕业间隔（天）")
    easy_interval: int = Field(default=4, ge=1, description="简单间隔（天）")


# ==================== 牌组 Schema ====================


class DeckBase(BaseModel):
    """牌组基础字段"""

    name: str = Field(..., min_length=1, max_length=100, description="牌组名称")
    parent_id: str | None = Field(default=None, description="父牌组ID")
    note_model_id: str | None = Field(default=None, description="绑定的笔记类型ID")
    config: DeckConfig = Field(default_factory=DeckConfig, description="牌组配置")
    scheduler: Literal["sm2", "fsrs_v4", "fsrs_v5"] = Field(default="sm2", description="调度算法")
    description: str | None = Field(default=None, max_length=500, description="牌组描述")


class DeckCreate(DeckBase):
    """创建牌组请求"""

    pass


class DeckUpdate(BaseModel):
    """更新牌组请求"""

    name: str | None = Field(default=None, min_length=1, max_length=100, description="牌组名称")
    parent_id: str | None = Field(default=None, description="父牌组ID")
    note_model_id: str | None = Field(default=None, description="绑定的笔记类型ID")
    config: DeckConfig | None = Field(default=None, description="牌组配置")
    scheduler: Literal["sm2", "fsrs_v4", "fsrs_v5"] | None = Field(default=None, description="调度算法")
    description: str | None = Field(default=None, max_length=500, description="牌组描述")


class DeckResponse(BaseModel):
    """牌组响应（不包含子牌组）"""

    id: str = Field(..., description="牌组ID")
    user_id: str = Field(..., description="所属用户ID")
    name: str = Field(..., description="牌组名称")
    parent_id: str | None = Field(default=None, description="父牌组ID")
    note_model_id: str | None = Field(default=None, description="绑定的笔记类型ID")
    config: dict = Field(default_factory=dict, description="牌组配置")
    scheduler: str = Field(default="sm2", description="调度算法")
    description: str | None = Field(default=None, description="牌组描述")
    created_at: datetime | None = Field(default=None, description="创建时间")
    updated_at: datetime | None = Field(default=None, description="更新时间")

    model_config = {"from_attributes": True}


class DeckTreeNode(DeckResponse):
    """牌组树节点（包含子牌组）"""

    children: list["DeckTreeNode"] = Field(default_factory=list, description="子牌组")


class DeckListQuery(BaseModel):
    """牌组列表查询参数"""

    keyword: str | None = Field(default=None, description="搜索关键词（名称）")
    parent_id: str | None = Field(default=None, description="父牌组ID（为空查询根牌组）")

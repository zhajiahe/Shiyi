"""
牌组相关的 Pydantic Schema

用于 API 请求和响应的数据验证和序列化
"""

from datetime import datetime

from pydantic import BaseModel, Field

# ==================== 牌组 Schema ====================


class DeckBase(BaseModel):
    """牌组基础字段"""

    name: str = Field(..., min_length=1, max_length=100, description="牌组名称")
    note_model_id: str | None = Field(default=None, description="绑定的笔记类型ID")
    description: str | None = Field(default=None, max_length=500, description="牌组描述")


class DeckCreate(DeckBase):
    """创建牌组请求"""

    pass


class DeckUpdate(BaseModel):
    """更新牌组请求"""

    name: str | None = Field(default=None, min_length=1, max_length=100, description="牌组名称")
    note_model_id: str | None = Field(default=None, description="绑定的笔记类型ID")
    description: str | None = Field(default=None, max_length=500, description="牌组描述")


class DeckResponse(BaseModel):
    """牌组响应"""

    id: str = Field(..., description="牌组ID")
    user_id: str = Field(..., description="所属用户ID")
    name: str = Field(..., description="牌组名称")
    note_model_id: str | None = Field(default=None, description="绑定的笔记类型ID")
    description: str | None = Field(default=None, description="牌组描述")
    created_at: datetime | None = Field(default=None, description="创建时间")
    updated_at: datetime | None = Field(default=None, description="更新时间")

    model_config = {"from_attributes": True}


class DeckListQuery(BaseModel):
    """牌组列表查询参数"""

    keyword: str | None = Field(default=None, description="搜索关键词（名称）")

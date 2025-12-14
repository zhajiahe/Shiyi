"""
共享牌组和主题相关的 Pydantic Schema

用于 API 请求和响应的数据验证和序列化
"""

from datetime import datetime

from pydantic import BaseModel, Field

# ==================== 共享牌组快照 Schema ====================


class SharedDeckSnapshotResponse(BaseModel):
    """共享牌组快照响应"""

    id: str = Field(..., description="快照ID")
    shared_deck_id: str = Field(..., description="共享牌组ID")
    version: int = Field(..., description="版本号")
    export_format_version: int = Field(default=1, description="导出格式版本")
    file_url: str = Field(..., description="文件URL")
    content_hash: str = Field(..., description="内容哈希")
    file_size: int | None = Field(default=None, description="文件大小（字节）")
    created_at: datetime | None = Field(default=None, description="创建时间")

    model_config = {"from_attributes": True}


# ==================== 共享牌组 Schema ====================


class SharedDeckBase(BaseModel):
    """共享牌组基础字段"""

    title: str = Field(..., min_length=1, max_length=200, description="标题")
    description: str | None = Field(default=None, description="描述（Markdown）")
    language: str = Field(default="zh-CN", max_length=10, description="语言")
    tags: list[str] = Field(default_factory=list, description="标签列表")
    cover_image_url: str | None = Field(default=None, max_length=500, description="封面图片URL")


class SharedDeckCreate(SharedDeckBase):
    """创建共享牌组请求"""

    slug: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$", description="URL 友好标识")


class SharedDeckUpdate(BaseModel):
    """更新共享牌组请求"""

    title: str | None = Field(default=None, min_length=1, max_length=200, description="标题")
    description: str | None = Field(default=None, description="描述")
    language: str | None = Field(default=None, max_length=10, description="语言")
    tags: list[str] | None = Field(default=None, description="标签列表")
    cover_image_url: str | None = Field(default=None, max_length=500, description="封面图片URL")
    is_active: bool | None = Field(default=None, description="是否上架")


class SharedDeckResponse(SharedDeckBase):
    """共享牌组响应"""

    id: str = Field(..., description="共享牌组ID")
    author_id: str = Field(..., description="作者ID")
    slug: str = Field(..., description="URL 友好标识")
    card_count: int = Field(default=0, description="卡片数量")
    note_count: int = Field(default=0, description="笔记数量")
    download_count: int = Field(default=0, description="下载次数")
    version: int = Field(default=1, description="当前版本号")
    content_hash: str | None = Field(default=None, description="内容哈希")
    is_featured: bool = Field(default=False, description="是否精选")
    is_official: bool = Field(default=False, description="是否官方")
    is_active: bool = Field(default=True, description="是否上架")
    created_at: datetime | None = Field(default=None, description="创建时间")
    updated_at: datetime | None = Field(default=None, description="更新时间")

    model_config = {"from_attributes": True}


class SharedDeckDetailResponse(SharedDeckResponse):
    """共享牌组详情响应（包含快照）"""

    snapshots: list[SharedDeckSnapshotResponse] = Field(default_factory=list, description="版本快照列表")


class SharedDeckListQuery(BaseModel):
    """共享牌组列表查询参数"""

    language: str | None = Field(default=None, description="语言过滤")
    tag: str | None = Field(default=None, description="标签过滤")
    q: str | None = Field(default=None, description="搜索关键词")
    is_featured: bool | None = Field(default=None, description="是否精选")
    is_official: bool | None = Field(default=None, description="是否官方")

"""
笔记类型和卡片模板相关的 Pydantic Schema

用于 API 请求和响应的数据验证和序列化
"""

from datetime import datetime

from pydantic import BaseModel, Field

# ==================== 字段定义 ====================


class FieldDefinition(BaseModel):
    """字段定义"""

    name: str = Field(..., min_length=1, max_length=50, description="字段名称")
    description: str | None = Field(default=None, max_length=200, description="字段描述")


# ==================== 卡片模板 Schema ====================


class CardTemplateBase(BaseModel):
    """卡片模板基础字段"""

    name: str = Field(..., min_length=1, max_length=100, description="模板名称")
    ord: int = Field(default=0, ge=0, description="模板序号（从0开始）")
    question_template: str = Field(default="{{Front}}", description="问题侧HTML模板")
    answer_template: str = Field(default="{{FrontSide}}<hr>{{Back}}", description="答案侧HTML模板")


class CardTemplateCreate(CardTemplateBase):
    """创建卡片模板请求"""

    pass


class CardTemplateUpdate(BaseModel):
    """更新卡片模板请求"""

    name: str | None = Field(default=None, min_length=1, max_length=100, description="模板名称")
    ord: int | None = Field(default=None, ge=0, description="模板序号")
    question_template: str | None = Field(default=None, description="问题侧HTML模板")
    answer_template: str | None = Field(default=None, description="答案侧HTML模板")


class CardTemplateResponse(CardTemplateBase):
    """卡片模板响应"""

    id: str = Field(..., description="模板ID")
    note_model_id: str = Field(..., description="所属笔记类型ID")
    created_at: datetime | None = Field(default=None, description="创建时间")
    updated_at: datetime | None = Field(default=None, description="更新时间")

    model_config = {"from_attributes": True}


# ==================== 笔记类型 Schema ====================


class NoteModelBase(BaseModel):
    """笔记类型基础字段"""

    name: str = Field(..., min_length=1, max_length=100, description="笔记类型名称")
    fields_schema: list[FieldDefinition] = Field(
        default_factory=lambda: [FieldDefinition(name="Front"), FieldDefinition(name="Back")],
        description="字段定义列表",
    )
    css: str | None = Field(default=None, description="自定义CSS样式")


class NoteModelCreate(NoteModelBase):
    """创建笔记类型请求"""

    templates: list[CardTemplateCreate] = Field(
        default_factory=lambda: [
            CardTemplateCreate(
                name="正向",
                ord=0,
                question_template="{{Front}}",
                answer_template="{{FrontSide}}<hr>{{Back}}",
            )
        ],
        description="卡片模板列表",
    )


class NoteModelUpdate(BaseModel):
    """更新笔记类型请求"""

    name: str | None = Field(default=None, min_length=1, max_length=100, description="笔记类型名称")
    fields_schema: list[FieldDefinition] | None = Field(default=None, description="字段定义列表")
    css: str | None = Field(default=None, description="自定义CSS样式")


class NoteModelResponse(NoteModelBase):
    """笔记类型响应"""

    id: str = Field(..., description="笔记类型ID")
    user_id: str = Field(..., description="所属用户ID")
    is_builtin: bool = Field(default=False, description="是否内置/预设模板")
    templates: list[CardTemplateResponse] = Field(default_factory=list, description="卡片模板列表")
    created_at: datetime | None = Field(default=None, description="创建时间")
    updated_at: datetime | None = Field(default=None, description="更新时间")

    model_config = {"from_attributes": True}


class NoteModelListQuery(BaseModel):
    """笔记类型列表查询参数"""

    keyword: str | None = Field(default=None, description="搜索关键词（名称）")

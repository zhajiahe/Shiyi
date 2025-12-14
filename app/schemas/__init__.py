"""
Pydantic Schema 模块

用于 API 请求和响应的数据验证和序列化
"""

from app.schemas.deck import (
    DeckConfig,
    DeckCreate,
    DeckListQuery,
    DeckResponse,
    DeckTreeNode,
    DeckUpdate,
)
from app.schemas.note import (
    CardListQuery,
    CardResponse,
    CardUpdate,
    NoteCreate,
    NoteListQuery,
    NoteResponse,
    NoteUpdate,
)
from app.schemas.note_model import (
    CardTemplateCreate,
    CardTemplateResponse,
    CardTemplateUpdate,
    FieldDefinition,
    NoteModelCreate,
    NoteModelListQuery,
    NoteModelResponse,
    NoteModelUpdate,
)
from app.schemas.review_log import (
    ReviewLogCreate,
    ReviewLogListQuery,
    ReviewLogResponse,
    ReviewStats,
)
from app.schemas.shared_deck import (
    SharedDeckCreate,
    SharedDeckDetailResponse,
    SharedDeckListQuery,
    SharedDeckResponse,
    SharedDeckSnapshotResponse,
    SharedDeckUpdate,
)
from app.schemas.user import (
    LoginRequest,
    PasswordChange,
    RefreshTokenRequest,
    UserCreate,
    UserListQuery,
    UserResponse,
    UserUpdate,
)

__all__ = [
    # User
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserListQuery",
    "PasswordChange",
    "LoginRequest",
    "RefreshTokenRequest",
    # NoteModel
    "FieldDefinition",
    "NoteModelCreate",
    "NoteModelUpdate",
    "NoteModelResponse",
    "NoteModelListQuery",
    "CardTemplateCreate",
    "CardTemplateUpdate",
    "CardTemplateResponse",
    # Deck
    "DeckConfig",
    "DeckCreate",
    "DeckUpdate",
    "DeckResponse",
    "DeckTreeNode",
    "DeckListQuery",
    # Note
    "NoteCreate",
    "NoteUpdate",
    "NoteResponse",
    "NoteListQuery",
    # Card
    "CardResponse",
    "CardUpdate",
    "CardListQuery",
    # ReviewLog
    "ReviewLogCreate",
    "ReviewLogResponse",
    "ReviewLogListQuery",
    "ReviewStats",
    # SharedDeck
    "SharedDeckCreate",
    "SharedDeckUpdate",
    "SharedDeckResponse",
    "SharedDeckDetailResponse",
    "SharedDeckListQuery",
    "SharedDeckSnapshotResponse",
]

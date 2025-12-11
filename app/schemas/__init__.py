"""
Pydantic Schema 模块

用于 API 请求和响应的数据验证和序列化
"""

from app.schemas.card import (
    CardDetailResponse,
    CardListQuery,
    CardResponse,
    CardScheduleUpdate,
    DueCardsQuery,
)
from app.schemas.deck import (
    DeckCreate,
    DeckListQuery,
    DeckResponse,
    DeckTreeNode,
    DeckUpdate,
)
from app.schemas.note import (
    NoteBatchCreate,
    NoteCreate,
    NoteListQuery,
    NoteResponse,
    NoteUpdate,
)
from app.schemas.note_model import (
    CardTemplateCreate,
    CardTemplateResponse,
    NoteModelCreate,
    NoteModelDetailResponse,
    NoteModelListQuery,
    NoteModelResponse,
    NoteModelUpdate,
)
from app.schemas.review import (
    ReviewBatchSubmit,
    ReviewLogResponse,
    ReviewStats,
    ReviewStatsQuery,
    ReviewSubmit,
)
from app.schemas.shared_deck import (
    SharedDeckCreate,
    SharedDeckDetailResponse,
    SharedDeckImportRequest,
    SharedDeckListQuery,
    SharedDeckResponse,
    SharedDeckUpdate,
)
from app.schemas.sync import (
    FullSyncRequest,
    FullSyncResponse,
    SyncChange,
    SyncConflict,
    SyncPullRequest,
    SyncPullResponse,
    SyncPushRequest,
    SyncPushResponse,
    SyncStatus,
    TableSyncData,
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
    "NoteModelCreate",
    "NoteModelUpdate",
    "NoteModelResponse",
    "NoteModelDetailResponse",
    "NoteModelListQuery",
    "CardTemplateCreate",
    "CardTemplateResponse",
    # Deck
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
    "NoteBatchCreate",
    # Card
    "CardResponse",
    "CardDetailResponse",
    "CardListQuery",
    "DueCardsQuery",
    "CardScheduleUpdate",
    # Review
    "ReviewSubmit",
    "ReviewLogResponse",
    "ReviewBatchSubmit",
    "ReviewStatsQuery",
    "ReviewStats",
    # Sync
    "SyncChange",
    "SyncPushRequest",
    "SyncPushResponse",
    "SyncConflict",
    "SyncPullRequest",
    "SyncPullResponse",
    "TableSyncData",
    "FullSyncRequest",
    "FullSyncResponse",
    "SyncStatus",
    # SharedDeck
    "SharedDeckCreate",
    "SharedDeckUpdate",
    "SharedDeckResponse",
    "SharedDeckDetailResponse",
    "SharedDeckListQuery",
    "SharedDeckImportRequest",
]

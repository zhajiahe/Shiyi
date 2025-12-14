"""
Repository 层

提供数据访问抽象，封装数据库操作逻辑
"""

from app.repositories.base import BaseRepository
from app.repositories.deck import DeckRepository
from app.repositories.note import CardRepository, NoteRepository
from app.repositories.note_model import CardTemplateRepository, NoteModelRepository
from app.repositories.review_log import ReviewLogRepository
from app.repositories.shared_deck import SharedDeckRepository, SharedDeckSnapshotRepository
from app.repositories.user import UserRepository

__all__ = [
    "BaseRepository",
    "UserRepository",
    "NoteModelRepository",
    "CardTemplateRepository",
    "DeckRepository",
    "NoteRepository",
    "CardRepository",
    "ReviewLogRepository",
    "SharedDeckRepository",
    "SharedDeckSnapshotRepository",
]

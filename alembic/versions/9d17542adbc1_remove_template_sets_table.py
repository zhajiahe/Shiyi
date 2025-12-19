"""remove template_sets table

Revision ID: 9d17542adbc1
Revises: b314fe7b75ca
Create Date: 2025-12-14 09:50:42.790872

"""
from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = '9d17542adbc1'
down_revision: str | Sequence[str] | None = 'b314fe7b75ca'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # No-op: template_sets 表已在原始迁移中移除
    pass


def downgrade() -> None:
    """Downgrade schema."""
    # No-op: 见上方注释
    pass

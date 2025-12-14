"""remove deck parent_id config scheduler columns

Revision ID: c33be573cea3
Revises: 9d17542adbc1
Create Date: 2025-12-14 11:09:37.316669

This is a placeholder migration. The actual column removal was done by
modifying the original c5d917d03885_add_deck_table.py migration.

For existing databases with these columns, manual migration is required.
"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = 'c33be573cea3'
down_revision: Union[str, Sequence[str], None] = '9d17542adbc1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op: columns already removed from original migration."""
    pass


def downgrade() -> None:
    """No-op: revert by modifying original migration."""
    pass

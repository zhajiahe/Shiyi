"""Add published_deck_id to decks table

Revision ID: 13347e4e0e57
Revises: c33be573cea3
Create Date: 2025-12-20 09:56:54.872898

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '13347e4e0e57'
down_revision: Union[str, Sequence[str], None] = 'c33be573cea3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # SQLite 不支持 ALTER 添加外键约束，使用 batch mode
    with op.batch_alter_table('decks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('published_deck_id', sa.String(length=36), nullable=True, comment='关联的已发布牌组ID'))
        batch_op.create_index(batch_op.f('ix_decks_published_deck_id'), ['published_deck_id'], unique=False)
        batch_op.create_foreign_key('fk_decks_published_deck_id', 'shared_decks', ['published_deck_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('decks', schema=None) as batch_op:
        batch_op.drop_constraint('fk_decks_published_deck_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_decks_published_deck_id'))
        batch_op.drop_column('published_deck_id')

"""remove template_sets table

Revision ID: 9d17542adbc1
Revises: b314fe7b75ca
Create Date: 2025-12-14 09:50:42.790872

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d17542adbc1'
down_revision: Union[str, Sequence[str], None] = 'b314fe7b75ca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 删除 template_sets 表
    op.drop_table('template_sets')


def downgrade() -> None:
    """Downgrade schema."""
    # 重新创建 template_sets 表
    op.create_table('template_sets',
        sa.Column('name', sa.String(length=100), nullable=False, comment='主题名称'),
        sa.Column('description', sa.String(length=500), nullable=True, comment='主题描述'),
        sa.Column('css', sa.Text(), nullable=False, comment='CSS 样式'),
        sa.Column('version', sa.Integer(), nullable=False, comment='版本号'),
        sa.Column('meta', sa.JSON(), nullable=True, comment='元数据（是否支持暗色模式等）'),
        sa.Column('is_official', sa.Boolean(), nullable=False, comment='是否官方主题'),
        sa.Column('id', sa.String(length=36), nullable=False, comment='主键ID(UUID)'),
        sa.Column('created_by', sa.String(length=50), nullable=True, comment='创建人'),
        sa.Column('updated_by', sa.String(length=50), nullable=True, comment='更新人'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False, comment='创建时间'),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False, comment='更新时间'),
        sa.Column('deleted_at', sa.DateTime(), nullable=True, comment='逻辑删除时间'),
        sa.PrimaryKeyConstraint('id')
    )

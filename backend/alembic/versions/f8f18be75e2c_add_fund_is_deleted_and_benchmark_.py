"""add fund is_deleted and benchmark numeric

Revision ID: f8f18be75e2c
Revises: d4e5f6g7h8i9
Create Date: 2026-03-22 15:06:09.436745
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f8f18be75e2c'
down_revision: Union[str, None] = 'd4e5f6g7h8i9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('funds', sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.alter_column('funds', 'benchmark_return_rate',
               existing_type=sa.DOUBLE_PRECISION(precision=53),
               type_=sa.Numeric(precision=10, scale=4),
               existing_nullable=True)


def downgrade() -> None:
    op.alter_column('funds', 'benchmark_return_rate',
               existing_type=sa.Numeric(precision=10, scale=4),
               type_=sa.DOUBLE_PRECISION(precision=53),
               existing_nullable=True)
    op.drop_column('funds', 'is_deleted')

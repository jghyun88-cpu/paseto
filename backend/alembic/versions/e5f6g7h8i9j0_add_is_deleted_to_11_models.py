"""add is_deleted to 11 models for soft delete consistency

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
Create Date: 2026-03-22 15:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "e5f6g7h8i9j0"
down_revision = "f8f18be75e2c"
branch_labels = None
depends_on = None

TABLES = [
    "screenings",
    "reviews",
    "investment_memos",
    "ic_decisions",
    "investment_contracts",
    "cap_table_entries",
    "handover_documents",
    "batches",
    "fund_lps",
    "fund_investments",
    "mentors",
]


def upgrade() -> None:
    for table in TABLES:
        op.add_column(
            table,
            sa.Column("is_deleted", sa.Boolean(), server_default=sa.false(), nullable=False),
        )


def downgrade() -> None:
    for table in reversed(TABLES):
        op.drop_column(table, "is_deleted")

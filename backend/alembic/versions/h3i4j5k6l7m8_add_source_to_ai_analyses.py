"""add source column to ai_analyses

Revision ID: h3i4j5k6l7m8
Revises: g2h3i4j5k6l7
Create Date: 2026-03-30 20:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "h3i4j5k6l7m8"
down_revision = "g2h3i4j5k6l7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "ai_analyses",
        sa.Column("source", sa.String(50), server_default="lsa_report", nullable=False),
    )
    # 기존 레코드를 legacy로 태깅
    op.execute(
        "UPDATE ai_analyses SET source = 'legacy_self_analysis' "
        "WHERE source = 'lsa_report'"
    )


def downgrade() -> None:
    op.drop_column("ai_analyses", "source")

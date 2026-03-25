"""add updated_at to handover_documents

Revision ID: g2h3i4j5k6l7
Revises: f1g2h3i4j5k6
Create Date: 2026-03-23 09:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "g2h3i4j5k6l7"
down_revision = "f1g2h3i4j5k6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "handover_documents",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("handover_documents", "updated_at")

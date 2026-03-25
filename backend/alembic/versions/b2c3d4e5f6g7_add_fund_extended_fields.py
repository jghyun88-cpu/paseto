"""add fund extended fields for 조합등록 폼

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-21
"""
from alembic import op
import sqlalchemy as sa

revision = "b2c3d4e5f6g7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("funds", sa.Column("fund_code", sa.String(50), nullable=True))
    op.add_column("funds", sa.Column("fund_account_type", sa.String(50), nullable=True))
    op.add_column("funds", sa.Column("key_managers", sa.Text(), nullable=True))
    op.add_column("funds", sa.Column("payment_method", sa.String(50), nullable=True))
    op.add_column("funds", sa.Column("benchmark_return_rate", sa.Float(), nullable=True))
    op.add_column("funds", sa.Column("investment_start_date", sa.Date(), nullable=True))
    op.add_column("funds", sa.Column("investment_end_date", sa.Date(), nullable=True))
    op.add_column("funds", sa.Column("duration_start_date", sa.Date(), nullable=True))
    op.add_column("funds", sa.Column("duration_end_date", sa.Date(), nullable=True))
    op.add_column("funds", sa.Column("dissolution_date", sa.Date(), nullable=True))
    op.add_column("funds", sa.Column("liquidation_date", sa.Date(), nullable=True))
    op.add_column("funds", sa.Column("management_fee", sa.String(100), nullable=True))
    op.add_column("funds", sa.Column("performance_fee", sa.String(100), nullable=True))
    op.add_column("funds", sa.Column("additional_performance_fee", sa.String(100), nullable=True))
    op.add_column("funds", sa.Column("priority_loss_reserve", sa.String(100), nullable=True))
    op.add_column("funds", sa.Column("investment_obligations", sa.Text(), nullable=True))
    op.add_column("funds", sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("funds", "notes")
    op.drop_column("funds", "investment_obligations")
    op.drop_column("funds", "priority_loss_reserve")
    op.drop_column("funds", "additional_performance_fee")
    op.drop_column("funds", "performance_fee")
    op.drop_column("funds", "management_fee")
    op.drop_column("funds", "liquidation_date")
    op.drop_column("funds", "dissolution_date")
    op.drop_column("funds", "duration_end_date")
    op.drop_column("funds", "duration_start_date")
    op.drop_column("funds", "investment_end_date")
    op.drop_column("funds", "investment_start_date")
    op.drop_column("funds", "benchmark_return_rate")
    op.drop_column("funds", "payment_method")
    op.drop_column("funds", "key_managers")
    op.drop_column("funds", "fund_account_type")
    op.drop_column("funds", "fund_code")

"""add fund_lps extended fields for LP master data

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-03-22
"""
from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6g7h8"
down_revision = "b2c3d4e5f6g7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("fund_lps", sa.Column("founded_date", sa.Date(), nullable=True))
    op.add_column("fund_lps", sa.Column("corporate_number", sa.String(20), nullable=True))
    op.add_column("fund_lps", sa.Column("business_registration_number", sa.String(20), nullable=True))
    op.add_column("fund_lps", sa.Column("ceo_name", sa.String(100), nullable=True))
    op.add_column("fund_lps", sa.Column("current_employees", sa.Integer(), nullable=True))
    op.add_column("fund_lps", sa.Column("location", sa.String(500), nullable=True))
    op.add_column("fund_lps", sa.Column("industry", sa.String(200), nullable=True))
    op.add_column("fund_lps", sa.Column("main_product", sa.String(300), nullable=True))
    op.add_column("fund_lps", sa.Column("city", sa.String(100), nullable=True))
    op.add_column("fund_lps", sa.Column("website", sa.String(500), nullable=True))
    op.add_column("fund_lps", sa.Column("contact_phone", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("fund_lps", "contact_phone")
    op.drop_column("fund_lps", "website")
    op.drop_column("fund_lps", "city")
    op.drop_column("fund_lps", "main_product")
    op.drop_column("fund_lps", "industry")
    op.drop_column("fund_lps", "location")
    op.drop_column("fund_lps", "current_employees")
    op.drop_column("fund_lps", "ceo_name")
    op.drop_column("fund_lps", "business_registration_number")
    op.drop_column("fund_lps", "corporate_number")
    op.drop_column("fund_lps", "founded_date")

"""create independent lps table for LP master data

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-03-22
"""
from alembic import op
import sqlalchemy as sa

revision = "d4e5f6g7h8i9"
down_revision = "c3d4e5f6g7h8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lps",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("lp_name", sa.String(200), nullable=False),
        sa.Column("corporate_number", sa.String(50), nullable=True),
        sa.Column("business_registration_number", sa.String(20), nullable=True),
        sa.Column("ceo_name", sa.String(100), nullable=True),
        sa.Column("founded_date", sa.Date(), nullable=True),
        sa.Column("current_employees", sa.Integer(), nullable=True),
        sa.Column("location", sa.String(500), nullable=True),
        sa.Column("industry", sa.String(200), nullable=True),
        sa.Column("ksic_code", sa.String(20), nullable=True),
        sa.Column("main_product", sa.String(500), nullable=True),
        sa.Column("stock_market", sa.String(50), nullable=True),
        sa.Column("listing_date", sa.Date(), nullable=True),
        sa.Column("total_assets", sa.BigInteger(), nullable=True),
        sa.Column("capital", sa.BigInteger(), nullable=True),
        sa.Column("current_revenue", sa.BigInteger(), nullable=True),
        sa.Column("operating_profit", sa.BigInteger(), nullable=True),
        sa.Column("has_research_lab", sa.Boolean(), nullable=True),
        sa.Column("research_staff_count", sa.Integer(), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("contact_person", sa.String(100), nullable=True),
        sa.Column("contact_phone", sa.String(50), nullable=True),
        sa.Column("contact_email", sa.String(200), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("lps")

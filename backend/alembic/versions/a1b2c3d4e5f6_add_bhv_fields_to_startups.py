"""add BHV company info fields to startups

Revision ID: a1b2c3d4e5f6
Revises: f66cb2482cc4
Create Date: 2026-03-21 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f66cb2482cc4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 사업정보
    op.add_column('startups', sa.Column('business_registration_number', sa.String(20), nullable=True))
    op.add_column('startups', sa.Column('ksic_code', sa.String(20), nullable=True))
    op.add_column('startups', sa.Column('main_product', sa.String(500), nullable=True))
    op.add_column('startups', sa.Column('stock_market', sa.String(50), nullable=True))
    op.add_column('startups', sa.Column('listing_date', sa.Date(), nullable=True))
    # 재무정보
    op.add_column('startups', sa.Column('total_assets', sa.Integer(), nullable=True))
    op.add_column('startups', sa.Column('capital', sa.Integer(), nullable=True))
    op.add_column('startups', sa.Column('operating_profit', sa.Integer(), nullable=True))
    # 연구개발
    op.add_column('startups', sa.Column('has_research_lab', sa.Boolean(), nullable=True))
    op.add_column('startups', sa.Column('research_staff_count', sa.Integer(), nullable=True))
    # 연락처
    op.add_column('startups', sa.Column('city', sa.String(100), nullable=True))
    op.add_column('startups', sa.Column('website', sa.String(500), nullable=True))
    op.add_column('startups', sa.Column('contact_person', sa.String(100), nullable=True))
    op.add_column('startups', sa.Column('contact_phone', sa.String(50), nullable=True))
    op.add_column('startups', sa.Column('contact_email', sa.String(200), nullable=True))
    # 기타
    op.add_column('startups', sa.Column('notes', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('startups', 'notes')
    op.drop_column('startups', 'contact_email')
    op.drop_column('startups', 'contact_phone')
    op.drop_column('startups', 'contact_person')
    op.drop_column('startups', 'website')
    op.drop_column('startups', 'city')
    op.drop_column('startups', 'research_staff_count')
    op.drop_column('startups', 'has_research_lab')
    op.drop_column('startups', 'operating_profit')
    op.drop_column('startups', 'capital')
    op.drop_column('startups', 'total_assets')
    op.drop_column('startups', 'listing_date')
    op.drop_column('startups', 'stock_market')
    op.drop_column('startups', 'main_product')
    op.drop_column('startups', 'ksic_code')
    op.drop_column('startups', 'business_registration_number')

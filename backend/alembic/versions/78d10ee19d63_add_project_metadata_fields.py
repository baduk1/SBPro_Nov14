"""add project metadata fields

Revision ID: 78d10ee19d63
Revises: 816840ff2ef0
Create Date: 2025-11-14 14:14:15.922582

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '78d10ee19d63'
down_revision: Union[str, None] = '816840ff2ef0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to projects table
    op.add_column('projects', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('start_date', sa.Date(), nullable=True))
    op.add_column('projects', sa.Column('end_date', sa.Date(), nullable=True))
    op.add_column('projects', sa.Column('status', sa.String(), server_default='active', nullable=False))
    op.add_column('projects', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove columns in reverse order
    op.drop_column('projects', 'updated_at')
    op.drop_column('projects', 'status')
    op.drop_column('projects', 'end_date')
    op.drop_column('projects', 'start_date')
    op.drop_column('projects', 'description')

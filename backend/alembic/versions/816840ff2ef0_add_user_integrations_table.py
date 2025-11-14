"""add_user_integrations_table

Revision ID: 816840ff2ef0
Revises: d176af525077
Create Date: 2025-11-13 13:09:30.114318

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '816840ff2ef0'
down_revision: Union[str, None] = 'd176af525077'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create user_integrations table for third-party integrations (Notion, etc.)"""

    op.create_table(
        'user_integrations',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('integration_type', sa.String(50), nullable=False),  # 'notion', 'zapier', etc.
        sa.Column('access_token', sa.Text(), nullable=False),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('workspace_id', sa.String(255), nullable=True),
        sa.Column('workspace_name', sa.String(255), nullable=True),
        sa.Column('bot_id', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('config_data', sa.Text(), nullable=True),  # JSON string for SQLite compatibility
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        # Unique constraint on (user_id, integration_type) - defined inline for SQLite compatibility
        sa.UniqueConstraint('user_id', 'integration_type', name='uq_user_integration_type')
    )

    # Create indexes
    op.create_index('idx_user_integrations_user_id', 'user_integrations', ['user_id'])
    op.create_index('idx_user_integrations_type', 'user_integrations', ['integration_type'])


def downgrade() -> None:
    """Drop user_integrations table"""

    op.drop_index('idx_user_integrations_type')
    op.drop_index('idx_user_integrations_user_id')
    op.drop_table('user_integrations')

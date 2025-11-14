"""add_task_position_for_kanban

Revision ID: c0a224d53ec1
Revises: aafbcc2ac520
Create Date: 2025-10-31 16:33:12.882014

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c0a224d53ec1'
down_revision: Union[str, None] = 'aafbcc2ac520'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add position column for Kanban board ordering
    op.add_column('tasks', sa.Column('position', sa.BigInteger(), nullable=False, server_default='0'))

    # Create composite index for efficient Kanban queries (project_id, status, position)
    op.create_index('idx_tasks_project_status_pos', 'tasks', ['project_id', 'status', 'position'], unique=False)


def downgrade() -> None:
    # Drop the index
    op.drop_index('idx_tasks_project_status_pos', table_name='tasks')

    # Drop the position column
    op.drop_column('tasks', 'position')

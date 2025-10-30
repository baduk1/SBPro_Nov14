"""add_boq_item_timestamps

Revision ID: aafbcc2ac520
Revises: 47df200fd252
Create Date: 2025-10-30 21:23:49.346036

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aafbcc2ac520'
down_revision: Union[str, None] = '47df200fd252'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add timestamp columns to boq_items for optimistic concurrency control
    # SQLite doesn't support non-constant defaults in ADD COLUMN, so we make them nullable
    # New rows will get proper defaults from the model's server_default
    op.add_column('boq_items', sa.Column('created_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('boq_items', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))

    # Update existing rows to have current timestamp (SQLite compatible)
    from sqlalchemy import text

    connection = op.get_bind()
    connection.execute(text("UPDATE boq_items SET created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))


def downgrade() -> None:
    # SQLite doesn't support DROP COLUMN, so skip in SQLite
    # In PostgreSQL, you can uncomment these:
    # op.drop_column('boq_items', 'updated_at')
    # op.drop_column('boq_items', 'created_at')
    pass

"""fix_task_id_autoincrement

Revision ID: d176af525077
Revises: 84e43fc57b81
Create Date: 2025-11-10 13:11:42.656977

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd176af525077'
down_revision: Union[str, None] = '84e43fc57b81'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix all BigInteger ID columns to use INTEGER with autoincrement for SQLite compatibility."""

    # Back up project_collaborators data (has 3 records)
    conn = op.get_bind()
    collabs = conn.execute(sa.text("""
        SELECT user_id, project_id, role, invited_by, invited_at, accepted_at
        FROM project_collaborators
    """)).fetchall()

    # Drop existing tables in correct order (respect foreign keys)
    # Tasks module
    op.drop_table('task_attachments')
    op.drop_table('task_dependencies')
    op.drop_table('task_revisions')
    op.drop_table('tasks')

    # Collaboration module
    op.drop_table('notifications')
    op.drop_table('activities')
    op.drop_table('comments')
    op.drop_table('project_invitations')
    op.drop_table('project_collaborators')

    # Recreate tasks table with INTEGER id (works with SQLite AUTOINCREMENT)
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=24), nullable=False, server_default='todo'),
        sa.Column('priority', sa.String(length=16), nullable=True),
        sa.Column('assignee_id', sa.String(), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('type', sa.String(length=24), nullable=True),
        sa.Column('linked_resource_type', sa.String(length=24), nullable=True),
        sa.Column('linked_resource_id', sa.String(), nullable=True),
        sa.Column('boq_item_id', sa.String(), nullable=True),
        sa.Column('labels', sa.JSON(), nullable=True),
        sa.Column('position', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('created_by', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['assignee_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE')
    )

    # Create indexes
    op.create_index('idx_tasks_project', 'tasks', ['project_id'])
    op.create_index('idx_tasks_assignee', 'tasks', ['assignee_id'])
    op.create_index('idx_tasks_status', 'tasks', ['status'])
    op.create_index('idx_tasks_due_date', 'tasks', ['due_date'])
    op.create_index('idx_tasks_created_by', 'tasks', ['created_by'])
    op.create_index('idx_tasks_project_status_pos', 'tasks', ['project_id', 'status', 'position'])

    # Recreate task_revisions
    op.create_table(
        'task_revisions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('changed_by', sa.String(), nullable=False),
        sa.Column('changes', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id'])
    )
    op.create_index('idx_task_rev_task', 'task_revisions', ['task_id'])
    op.create_index('idx_task_rev_project', 'task_revisions', ['project_id'])
    op.create_index('idx_task_rev_created', 'task_revisions', ['created_at'])

    # Recreate task_dependencies
    op.create_table(
        'task_dependencies',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('depends_on_task_id', sa.Integer(), nullable=False),
        sa.Column('dependency_type', sa.String(length=16), nullable=False, server_default='blocks'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['depends_on_task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.CheckConstraint("dependency_type IN ('blocks', 'blocked_by', 'relates_to')", name='check_dep_type'),
        sa.CheckConstraint("task_id != depends_on_task_id", name='check_no_self_dep')
    )
    op.create_index('idx_task_deps_task', 'task_dependencies', ['task_id'])
    op.create_index('idx_task_deps_depends', 'task_dependencies', ['depends_on_task_id'])

    # Recreate task_attachments
    op.create_table(
        'task_attachments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.Text(), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('uploaded_by', sa.String(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'])
    )
    op.create_index('idx_task_attach_task', 'task_attachments', ['task_id'])

    # === Collaboration Module Tables ===

    # Recreate project_collaborators
    op.create_table(
        'project_collaborators',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('role', sa.String(length=16), nullable=False),
        sa.Column('invited_by', sa.String(), nullable=False),
        sa.Column('invited_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by'], ['users.id']),
        sa.CheckConstraint("role IN ('owner', 'editor', 'viewer')", name='check_role')
    )
    op.create_index('idx_collab_project', 'project_collaborators', ['project_id'])
    op.create_index('idx_collab_user', 'project_collaborators', ['user_id'])
    op.create_index('idx_collab_project_user', 'project_collaborators', ['project_id', 'user_id'], unique=True)

    # Restore backed up collaborators
    for collab in collabs:
        conn.execute(sa.text("""
            INSERT INTO project_collaborators (user_id, project_id, role, invited_by, invited_at, accepted_at)
            VALUES (:user_id, :project_id, :role, :invited_by, :invited_at, :accepted_at)
        """), {
            'user_id': collab[0],
            'project_id': collab[1],
            'role': collab[2],
            'invited_by': collab[3],
            'invited_at': collab[4],
            'accepted_at': collab[5]
        })

    # Recreate project_invitations
    op.create_table(
        'project_invitations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('role', sa.String(length=16), nullable=False),
        sa.Column('token_hash', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='pending'),
        sa.Column('invited_by', sa.String(), nullable=False),
        sa.Column('invited_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by'], ['users.id']),
        sa.CheckConstraint("role IN ('editor', 'viewer')", name='check_invite_role'),
        sa.CheckConstraint("status IN ('pending', 'accepted', 'revoked', 'expired')", name='check_status')
    )
    op.create_index('idx_invites_project', 'project_invitations', ['project_id'])
    op.create_index('idx_invites_email', 'project_invitations', ['email'])
    op.create_index('idx_invites_status', 'project_invitations', ['status'])
    op.create_index('idx_invites_token', 'project_invitations', ['token_hash'], unique=True)

    # Recreate comments
    op.create_table(
        'comments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('context_type', sa.String(length=16), nullable=False),
        sa.Column('context_id', sa.String(), nullable=False),
        sa.Column('author_id', sa.String(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['users.id']),
        sa.ForeignKeyConstraint(['parent_id'], ['comments.id'], ondelete='CASCADE'),
        sa.CheckConstraint("context_type IN ('boq', 'task', 'project')", name='check_context_type')
    )
    op.create_index('idx_comments_project_context', 'comments', ['project_id', 'context_type', 'context_id'])
    op.create_index('idx_comments_author', 'comments', ['author_id'])
    op.create_index('idx_comments_created', 'comments', ['created_at'])

    # Recreate activities
    op.create_table(
        'activities',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('actor_id', sa.String(), nullable=False),
        sa.Column('type', sa.String(length=64), nullable=False),
        sa.Column('payload', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'])
    )
    op.create_index('idx_activities_project_created', 'activities', ['project_id', 'created_at'])
    op.create_index('idx_activities_type', 'activities', ['type'])
    op.create_index('idx_activities_actor', 'activities', ['actor_id'])

    # Recreate notifications
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('project_id', sa.String(), nullable=True),
        sa.Column('type', sa.String(length=64), nullable=False),
        sa.Column('payload', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE')
    )
    op.create_index('idx_notifications_user_unread', 'notifications', ['user_id', 'read_at'])
    op.create_index('idx_notifications_created', 'notifications', ['created_at'])


def downgrade() -> None:
    """Revert back to BIGINT id columns (not recommended)."""

    # Drop tables
    op.drop_table('task_attachments')
    op.drop_table('task_dependencies')
    op.drop_table('task_revisions')
    op.drop_table('tasks')

    # Recreate with BIGINT (original schema - won't work with SQLite autoincrement)
    op.create_table(
        'tasks',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=24), nullable=False, server_default='todo'),
        sa.Column('priority', sa.String(length=16), nullable=True),
        sa.Column('assignee_id', sa.String(), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('type', sa.String(length=24), nullable=True),
        sa.Column('linked_resource_type', sa.String(length=24), nullable=True),
        sa.Column('linked_resource_id', sa.String(), nullable=True),
        sa.Column('boq_item_id', sa.String(), nullable=True),
        sa.Column('labels', sa.JSON(), nullable=True),
        sa.Column('position', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('created_by', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['assignee_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE')
    )

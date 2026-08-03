"""Add is_paused to habits

Revision ID: 4b8c9d2e1f3a
Revises: 3ef744e7f1df
Create Date: 2026-07-28 17:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '4b8c9d2e1f3a'
down_revision: Union[str, None] = '3ef744e7f1df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('habits', sa.Column('is_paused', sa.Boolean(), server_default=sa.text('false'), nullable=False))

def downgrade() -> None:
    op.drop_column('habits', 'is_paused')

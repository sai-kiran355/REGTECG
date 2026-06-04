"""Add updated_at column to chat_messages table

Revision ID: 0008
Revises: 0007
Create Date: 2024-01-08 00:00:00.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "chat_messages",
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema="public",
    )


def downgrade() -> None:
    op.drop_column("chat_messages", "updated_at", schema="public")

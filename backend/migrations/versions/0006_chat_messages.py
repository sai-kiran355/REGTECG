"""Add chat_messages table for officer-applicant communication

Revision ID: 0006
Revises: 0005
Create Date: 2024-01-06 00:00:00.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("public.tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("public.cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_type", sa.VARCHAR(20), nullable=False),  # 'officer' or 'applicant'
        sa.Column("sender_name", sa.VARCHAR(100), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("sender_type IN ('officer', 'applicant')", name="ck_chat_messages_sender_type"),
        schema="public",
    )
    op.create_index("ix_chat_messages_case_id", "chat_messages", ["case_id"], schema="public")
    op.create_index("ix_chat_messages_tenant_id", "chat_messages", ["tenant_id"], schema="public")
    op.create_index("ix_chat_messages_created_at", "chat_messages", ["created_at"], schema="public")


def downgrade() -> None:
    op.drop_table("chat_messages", schema="public")

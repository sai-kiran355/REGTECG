"""Add applicant_accounts table for customer self-service portal

Revision ID: 0005
Revises: 0004
Create Date: 2024-01-05 00:00:00.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "applicant_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("public.tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.VARCHAR(254), nullable=False),
        sa.Column("hashed_password", sa.VARCHAR(255), nullable=False),
        sa.Column("full_name", sa.VARCHAR(100), nullable=False, server_default=""),
        sa.Column("mobile", sa.VARCHAR(15), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("tenant_id", "email", name="uq_applicant_accounts_tenant_email"),
        schema="public",
    )
    op.create_index("ix_applicant_accounts_tenant_id", "applicant_accounts", ["tenant_id"], schema="public")
    op.create_index("ix_applicant_accounts_email", "applicant_accounts", ["email"], schema="public")


def downgrade() -> None:
    op.drop_table("applicant_accounts", schema="public")

"""Add document_data table for storing KYC documents in PostgreSQL

Revision ID: 0004
Revises: 0003
Create Date: 2024-01-04 00:00:00.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "kyc_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("kyc_record_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("public.kyc_records.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("public.tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("document_type", sa.VARCHAR(50), nullable=False),
        sa.Column("file_name", sa.VARCHAR(255), nullable=False),
        sa.Column("content_type", sa.VARCHAR(100), nullable=False),
        sa.Column("file_data", sa.LargeBinary(), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
        schema="public",
    )
    op.create_index("ix_kyc_documents_kyc_record_id", "kyc_documents",
                    ["kyc_record_id"], schema="public")
    op.create_index("ix_kyc_documents_tenant_id", "kyc_documents",
                    ["tenant_id"], schema="public")


def downgrade() -> None:
    op.drop_table("kyc_documents", schema="public")

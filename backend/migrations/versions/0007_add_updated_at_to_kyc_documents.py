"""Add updated_at column to kyc_documents table

Revision ID: 0007
Revises: 0006
Create Date: 2024-01-07 00:00:00.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "kyc_documents",
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema="public",
    )


def downgrade() -> None:
    op.drop_column("kyc_documents", "updated_at", schema="public")

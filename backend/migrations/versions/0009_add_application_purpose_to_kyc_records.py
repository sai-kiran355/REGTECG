"""add application_purpose to kyc_records

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-05 10:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0009"
down_revision: str = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "kyc_records",
        sa.Column("application_purpose", sa.String(50), nullable=True),
        schema="public",
    )
    op.create_index(
        "ix_public_kyc_records_application_purpose",
        "kyc_records",
        ["application_purpose"],
        schema="public",
    )


def downgrade() -> None:
    op.drop_index(
        "ix_public_kyc_records_application_purpose",
        table_name="kyc_records",
        schema="public",
    )
    op.drop_column("kyc_records", "application_purpose", schema="public")

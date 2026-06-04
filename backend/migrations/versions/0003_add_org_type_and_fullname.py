"""Add organization_type to tenants and full_name to users

Revision ID: 0003
Revises: 0002
Create Date: 2024-01-03 00:00:00.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add organization_type to tenants
    op.add_column(
        "tenants",
        sa.Column(
            "organization_type",
            sa.VARCHAR(20),
            nullable=False,
            server_default=sa.text("'bank'"),
        ),
        schema="public",
    )

    # Add full_name to users
    op.add_column(
        "users",
        sa.Column(
            "full_name",
            sa.VARCHAR(100),
            nullable=False,
            server_default=sa.text("''"),
        ),
        schema="public",
    )


def downgrade() -> None:
    op.drop_column("users", "full_name", schema="public")
    op.drop_column("tenants", "organization_type", schema="public")

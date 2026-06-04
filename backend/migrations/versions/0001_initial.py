"""Initial schema: roles, role_permissions, tenants, users + seed built-in roles

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. public.roles
    # ------------------------------------------------------------------
    op.create_table(
        "roles",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.VARCHAR(50), unique=True, nullable=False),
        sa.Column(
            "is_builtin",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema="public",
    )

    # ------------------------------------------------------------------
    # 2. public.role_permissions
    # ------------------------------------------------------------------
    op.create_table(
        "role_permissions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "role_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("public.roles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("permission", sa.VARCHAR(100), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema="public",
    )

    # ------------------------------------------------------------------
    # 3. public.tenants
    # ------------------------------------------------------------------
    op.create_table(
        "tenants",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("slug", sa.VARCHAR(), unique=True, nullable=False),
        sa.Column("name", sa.VARCHAR(255), nullable=False),
        sa.Column(
            "status",
            sa.VARCHAR(20),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            r"slug ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'",
            name="ck_tenants_slug_format",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'inactive', 'suspended')",
            name="ck_tenants_status",
        ),
        schema="public",
    )

    # ------------------------------------------------------------------
    # 4. public.users
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("public.tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("email", sa.VARCHAR(254), nullable=False),
        sa.Column("hashed_password", sa.VARCHAR(255), nullable=False),
        sa.Column(
            "role_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("public.roles.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
        schema="public",
    )

    # ------------------------------------------------------------------
    # 5. Seed built-in roles
    #
    # We use raw SQL via op.execute for reliability — bulk_insert does not
    # support server-side UUID generation in all Alembic versions.
    # ------------------------------------------------------------------

    # admin — all permissions
    op.execute(
        """
        INSERT INTO public.roles (name, is_builtin)
        VALUES ('admin', true)
        """
    )
    op.execute(
        """
        INSERT INTO public.role_permissions (role_id, permission)
        SELECT id, unnest(ARRAY[
            'cases:read',
            'cases:write',
            'kyc:read',
            'kyc:write',
            'aml:read',
            'aml:write',
            'sanctions:read',
            'reports:read',
            'reports:generate',
            'audit:read',
            'admin:users',
            'admin:tenants',
            'admin:roles'
        ])
        FROM public.roles
        WHERE name = 'admin'
        """
    )

    # analyst
    op.execute(
        """
        INSERT INTO public.roles (name, is_builtin)
        VALUES ('analyst', true)
        """
    )
    op.execute(
        """
        INSERT INTO public.role_permissions (role_id, permission)
        SELECT id, unnest(ARRAY[
            'cases:read',
            'cases:write',
            'kyc:read',
            'kyc:write',
            'aml:read',
            'aml:write',
            'sanctions:read',
            'reports:read'
        ])
        FROM public.roles
        WHERE name = 'analyst'
        """
    )

    # auditor
    op.execute(
        """
        INSERT INTO public.roles (name, is_builtin)
        VALUES ('auditor', true)
        """
    )
    op.execute(
        """
        INSERT INTO public.role_permissions (role_id, permission)
        SELECT id, unnest(ARRAY[
            'cases:read',
            'kyc:read',
            'aml:read',
            'sanctions:read',
            'reports:read',
            'audit:read'
        ])
        FROM public.roles
        WHERE name = 'auditor'
        """
    )

    # viewer
    op.execute(
        """
        INSERT INTO public.roles (name, is_builtin)
        VALUES ('viewer', true)
        """
    )
    op.execute(
        """
        INSERT INTO public.role_permissions (role_id, permission)
        SELECT id, unnest(ARRAY[
            'cases:read',
            'kyc:read',
            'sanctions:read'
        ])
        FROM public.roles
        WHERE name = 'viewer'
        """
    )


def downgrade() -> None:
    # Drop in reverse dependency order.
    op.drop_table("users", schema="public")
    op.drop_table("tenants", schema="public")
    op.drop_table("role_permissions", schema="public")
    op.drop_table("roles", schema="public")

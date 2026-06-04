"""Compliance tables: cases, kyc_records, aml_alerts, sanctions_screenings, audit_logs

Revision ID: 0002
Revises: 0001
Create Date: 2024-01-02 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. public.cases
    # ------------------------------------------------------------------
    op.create_table(
        "cases",
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
        sa.Column("case_number", sa.VARCHAR(50), nullable=False),
        sa.Column("subject_name", sa.VARCHAR(255), nullable=False),
        sa.Column("subject_type", sa.VARCHAR(20), nullable=False),
        sa.Column("case_type", sa.VARCHAR(20), nullable=False),
        sa.Column(
            "status",
            sa.VARCHAR(20),
            nullable=False,
            server_default=sa.text("'open'"),
        ),
        sa.Column(
            "risk_level",
            sa.VARCHAR(20),
            nullable=False,
            server_default=sa.text("'medium'"),
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "assigned_to",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("public.users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("public.users.id", ondelete="RESTRICT"),
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
        sa.CheckConstraint(
            "subject_type IN ('individual', 'entity')",
            name="ck_cases_subject_type",
        ),
        sa.CheckConstraint(
            "case_type IN ('aml', 'kyc', 'sanctions')",
            name="ck_cases_case_type",
        ),
        sa.CheckConstraint(
            "status IN ('open', 'in_review', 'pending', 'closed')",
            name="ck_cases_status",
        ),
        sa.CheckConstraint(
            "risk_level IN ('low', 'medium', 'high', 'critical')",
            name="ck_cases_risk_level",
        ),
        schema="public",
    )
    op.create_index("ix_cases_tenant_id", "cases", ["tenant_id"], schema="public")
    op.create_index("ix_cases_case_number", "cases", ["case_number"], schema="public")
    op.create_index("ix_cases_case_type", "cases", ["case_type"], schema="public")
    op.create_index("ix_cases_status", "cases", ["status"], schema="public")
    op.create_index("ix_cases_risk_level", "cases", ["risk_level"], schema="public")
    # Unique case_number per tenant
    op.create_index(
        "uq_cases_tenant_case_number",
        "cases",
        ["tenant_id", "case_number"],
        unique=True,
        schema="public",
    )

    # ------------------------------------------------------------------
    # 2. public.kyc_records
    # ------------------------------------------------------------------
    op.create_table(
        "kyc_records",
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
        sa.Column(
            "case_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("public.cases.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("full_name", sa.VARCHAR(255), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("nationality", sa.VARCHAR(2), nullable=False),
        sa.Column("document_type", sa.VARCHAR(30), nullable=False),
        sa.Column("document_number", sa.VARCHAR(100), nullable=False),
        sa.Column(
            "status",
            sa.VARCHAR(20),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column(
            "risk_level",
            sa.VARCHAR(20),
            nullable=False,
            server_default=sa.text("'low'"),
        ),
        sa.Column(
            "reviewer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("public.users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
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
            "document_type IN ('passport', 'national_id', 'drivers_license')",
            name="ck_kyc_records_document_type",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'in_review', 'verified', 'rejected')",
            name="ck_kyc_records_status",
        ),
        sa.CheckConstraint(
            "risk_level IN ('low', 'medium', 'high')",
            name="ck_kyc_records_risk_level",
        ),
        schema="public",
    )
    op.create_index("ix_kyc_records_tenant_id", "kyc_records", ["tenant_id"], schema="public")
    op.create_index("ix_kyc_records_case_id", "kyc_records", ["case_id"], schema="public")
    op.create_index("ix_kyc_records_status", "kyc_records", ["status"], schema="public")
    op.create_index("ix_kyc_records_risk_level", "kyc_records", ["risk_level"], schema="public")

    # ------------------------------------------------------------------
    # 3. public.aml_alerts
    # ------------------------------------------------------------------
    op.create_table(
        "aml_alerts",
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
        sa.Column(
            "case_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("public.cases.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("entity_name", sa.VARCHAR(255), nullable=False),
        sa.Column("entity_type", sa.VARCHAR(20), nullable=False),
        sa.Column("alert_type", sa.VARCHAR(50), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column(
            "currency",
            sa.VARCHAR(3),
            nullable=False,
            server_default=sa.text("'USD'"),
        ),
        sa.Column("risk_score", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "status",
            sa.VARCHAR(20),
            nullable=False,
            server_default=sa.text("'open'"),
        ),
        sa.Column("description", sa.Text(), nullable=False),
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
            "entity_type IN ('individual', 'entity')",
            name="ck_aml_alerts_entity_type",
        ),
        sa.CheckConstraint(
            "alert_type IN ('structuring', 'layering', 'unusual_pattern', 'high_risk_country', 'cash_intensive', 'round_tripping')",
            name="ck_aml_alerts_alert_type",
        ),
        sa.CheckConstraint(
            "status IN ('open', 'in_review', 'closed', 'false_positive')",
            name="ck_aml_alerts_status",
        ),
        sa.CheckConstraint(
            "risk_score >= 0 AND risk_score <= 100",
            name="ck_aml_alerts_risk_score",
        ),
        schema="public",
    )
    op.create_index("ix_aml_alerts_tenant_id", "aml_alerts", ["tenant_id"], schema="public")
    op.create_index("ix_aml_alerts_case_id", "aml_alerts", ["case_id"], schema="public")
    op.create_index("ix_aml_alerts_alert_type", "aml_alerts", ["alert_type"], schema="public")
    op.create_index("ix_aml_alerts_status", "aml_alerts", ["status"], schema="public")

    # ------------------------------------------------------------------
    # 4. public.sanctions_screenings
    # ------------------------------------------------------------------
    op.create_table(
        "sanctions_screenings",
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
        sa.Column("entity_name", sa.VARCHAR(255), nullable=False),
        sa.Column("entity_type", sa.VARCHAR(20), nullable=False),
        sa.Column("sanctions_list", sa.VARCHAR(50), nullable=False),
        sa.Column("match_type", sa.VARCHAR(20), nullable=False),
        sa.Column("match_score", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "status",
            sa.VARCHAR(20),
            nullable=False,
            server_default=sa.text("'review'"),
        ),
        sa.Column(
            "screened_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("public.users.id", ondelete="SET NULL"),
            nullable=True,
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
            "entity_type IN ('individual', 'entity')",
            name="ck_sanctions_screenings_entity_type",
        ),
        sa.CheckConstraint(
            "match_type IN ('confirmed', 'possible', 'no_match')",
            name="ck_sanctions_screenings_match_type",
        ),
        sa.CheckConstraint(
            "status IN ('hit', 'review', 'clear')",
            name="ck_sanctions_screenings_status",
        ),
        sa.CheckConstraint(
            "match_score >= 0 AND match_score <= 100",
            name="ck_sanctions_screenings_match_score",
        ),
        schema="public",
    )
    op.create_index(
        "ix_sanctions_screenings_tenant_id",
        "sanctions_screenings",
        ["tenant_id"],
        schema="public",
    )
    op.create_index(
        "ix_sanctions_screenings_sanctions_list",
        "sanctions_screenings",
        ["sanctions_list"],
        schema="public",
    )
    op.create_index(
        "ix_sanctions_screenings_match_type",
        "sanctions_screenings",
        ["match_type"],
        schema="public",
    )
    op.create_index(
        "ix_sanctions_screenings_status",
        "sanctions_screenings",
        ["status"],
        schema="public",
    )

    # ------------------------------------------------------------------
    # 5. public.audit_logs
    # ------------------------------------------------------------------
    op.create_table(
        "audit_logs",
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
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("public.users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("user_email", sa.VARCHAR(254), nullable=False),
        sa.Column("action", sa.VARCHAR(100), nullable=False),
        sa.Column("resource_type", sa.VARCHAR(50), nullable=False),
        sa.Column("resource_id", sa.VARCHAR(255), nullable=False),
        sa.Column("ip_address", sa.VARCHAR(45), nullable=True),
        sa.Column(
            "result",
            sa.VARCHAR(20),
            nullable=False,
            server_default=sa.text("'success'"),
        ),
        sa.Column("details", postgresql.JSON(astext_type=sa.Text()), nullable=True),
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
            "result IN ('success', 'failure', 'denied')",
            name="ck_audit_logs_result",
        ),
        schema="public",
    )
    op.create_index("ix_audit_logs_tenant_id", "audit_logs", ["tenant_id"], schema="public")
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"], schema="public")
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"], schema="public")
    op.create_index("ix_audit_logs_resource_type", "audit_logs", ["resource_type"], schema="public")
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"], schema="public")


def downgrade() -> None:
    # Drop in reverse dependency order.
    op.drop_table("audit_logs", schema="public")
    op.drop_table("sanctions_screenings", schema="public")
    op.drop_table("aml_alerts", schema="public")
    op.drop_table("kyc_records", schema="public")
    op.drop_table("cases", schema="public")

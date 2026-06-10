"""
Import all ORM models so that Alembic autogenerate can discover every table.
"""

from models.tenant import Tenant
from models.role import Role
from models.role_permission import RolePermission
from models.user import User
from models.case import Case
from models.kyc_record import KYCRecord
from models.aml_alert import AMLAlert
from models.sanctions_screening import SanctionsScreening
from models.audit_log import AuditLog
from models.kyc_document import KYCDocument
from models.applicant_account import ApplicantAccount

from models.chat_message import ChatMessage
from models.employee import Employee

__all__ = [
    "Tenant", "Role", "RolePermission", "User",
    "Case", "KYCRecord", "AMLAlert", "SanctionsScreening", "AuditLog",
    "KYCDocument", "ApplicantAccount", "ChatMessage", "Employee",
]

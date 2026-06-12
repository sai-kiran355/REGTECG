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
from models.candidate import Candidate, CandidateResume
from models.job import Job
from models.attendance import AttendanceLog, LeaveRequest, ShiftSchedule
from models.payroll import SalaryStructure, PayrollLog
from models.analytics import PerformanceReview, HeadcountPlan, AttritionPrediction
from models.integration import IntegrationConfig, ApiKey, WebhookSubscription, WebhookDeliveryLog

__all__ = [
    "Tenant", "Role", "RolePermission", "User",
    "Case", "KYCRecord", "AMLAlert", "SanctionsScreening", "AuditLog",
    "KYCDocument", "ApplicantAccount", "ChatMessage", "Employee",
    "Candidate", "CandidateResume", "Job",
    "AttendanceLog", "LeaveRequest", "ShiftSchedule",
    "SalaryStructure", "PayrollLog",
    "PerformanceReview", "HeadcountPlan", "AttritionPrediction",
    "IntegrationConfig", "ApiKey", "WebhookSubscription", "WebhookDeliveryLog",
]

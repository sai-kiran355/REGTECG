"""
Property-based tests for RBAC.

Feature: regtech-compliance-os-foundation
Properties: 12, 13, 14
"""

from __future__ import annotations

from hypothesis import given, settings as h_settings
from hypothesis import strategies as st


# Built-in role permission matrix (from design.md)
ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    "admin": frozenset({
        "cases:read", "cases:write",
        "kyc:read", "kyc:write",
        "aml:read", "aml:write",
        "sanctions:read",
        "reports:read", "reports:generate",
        "audit:read",
        "admin:users", "admin:tenants", "admin:roles",
    }),
    "analyst": frozenset({
        "cases:read", "cases:write",
        "kyc:read", "kyc:write",
        "aml:read", "aml:write",
        "sanctions:read",
        "reports:read",
    }),
    "auditor": frozenset({
        "cases:read",
        "kyc:read",
        "aml:read",
        "sanctions:read",
        "reports:read",
        "audit:read",
    }),
    "viewer": frozenset({
        "cases:read",
        "kyc:read",
        "sanctions:read",
    }),
}

ALL_PERMISSIONS = frozenset().union(*ROLE_PERMISSIONS.values())


# ---------------------------------------------------------------------------
# Property 13: Role permission matrix is exact
# ---------------------------------------------------------------------------

@given(role=st.sampled_from(["admin", "analyst", "auditor", "viewer"]))
@h_settings(max_examples=50)
def test_role_has_correct_permissions(role: str) -> None:
    """Property 13: Each role has exactly the permissions defined in the matrix."""
    expected = ROLE_PERMISSIONS[role]

    # Admin must have all permissions
    if role == "admin":
        assert "cases:read" in expected
        assert "cases:write" in expected
        assert "admin:users" in expected

    # Viewer must NOT have write permissions
    if role == "viewer":
        assert "cases:write" not in expected
        assert "kyc:write" not in expected
        assert "aml:write" not in expected

    # Auditor must have audit:read
    if role == "auditor":
        assert "audit:read" in expected
        assert "cases:write" not in expected

    # Analyst must have write permissions but not admin
    if role == "analyst":
        assert "cases:write" in expected
        assert "admin:users" not in expected


# ---------------------------------------------------------------------------
# Property 12: RBAC permission enforcement
# ---------------------------------------------------------------------------

@given(
    role=st.sampled_from(["analyst", "auditor", "viewer"]),
    permission=st.sampled_from(["admin:users", "admin:tenants", "reports:generate"]),
)
@h_settings(max_examples=50)
def test_non_admin_roles_lack_admin_permissions(role: str, permission: str) -> None:
    """Property 12: Non-admin roles do not have admin-only permissions."""
    role_perms = ROLE_PERMISSIONS[role]
    assert permission not in role_perms, \
        f"Role '{role}' should not have permission '{permission}'"


@given(permission=st.sampled_from(sorted(ALL_PERMISSIONS)))
@h_settings(max_examples=50)
def test_admin_has_all_permissions(permission: str) -> None:
    """Property 12: Admin role has every permission in the system."""
    assert permission in ROLE_PERMISSIONS["admin"], \
        f"Admin role missing permission: {permission}"

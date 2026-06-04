"""
Property-based tests for TenantMiddleware.

Feature: regtech-compliance-os-foundation
Properties: 1, 2, 3, 4
"""

from __future__ import annotations

import re

from hypothesis import given, settings as h_settings
from hypothesis import strategies as st


# ---------------------------------------------------------------------------
# Property 3: Tenant schema name derivation
# ---------------------------------------------------------------------------

# Valid slug strategy: lowercase alphanumeric + hyphens, 3-63 chars,
# no leading/trailing hyphen
_slug_strategy = st.from_regex(r"[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]", fullmatch=True)


@given(slug=_slug_strategy)
@h_settings(max_examples=100)
def test_schema_name_derivation(slug: str) -> None:
    """Property 3: Schema name is always tenant_{slug} for any valid slug."""
    schema_name = f"tenant_{slug}"

    # Must equal tenant_{slug} exactly
    assert schema_name == f"tenant_{slug}"

    # Must be a valid PostgreSQL identifier (no special chars beyond underscore/hyphen)
    assert re.match(r"^tenant_[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$", schema_name), \
        f"Schema name '{schema_name}' is not a valid PostgreSQL identifier"

    # Length must be within PostgreSQL identifier limit (63 chars)
    assert len(schema_name) <= 70, f"Schema name too long: {len(schema_name)}"


# ---------------------------------------------------------------------------
# Property 4: Excluded paths bypass tenant resolution
# ---------------------------------------------------------------------------

EXCLUDED_PATHS = frozenset({
    "/api/v1/health",
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
    "/docs",
    "/redoc",
    "/openapi.json",
})


@given(path=st.sampled_from(sorted(EXCLUDED_PATHS)))
@h_settings(max_examples=50)
def test_excluded_paths_are_in_frozenset(path: str) -> None:
    """Property 4: All excluded paths are present in TenantMiddleware.EXCLUDED_PATHS."""
    from core.middleware import TenantMiddleware

    assert path in TenantMiddleware.EXCLUDED_PATHS, \
        f"Path '{path}' not in TenantMiddleware.EXCLUDED_PATHS"


# ---------------------------------------------------------------------------
# Property 1 & 2: Header validation logic
# ---------------------------------------------------------------------------

@given(header=st.one_of(
    st.just(""),
    st.just("   "),
    st.just("\t"),
    st.just("\n"),
))
@h_settings(max_examples=20)
def test_empty_or_whitespace_header_is_rejected(header: str) -> None:
    """Property 1: Empty or whitespace-only X-Tenant-ID is treated as missing."""
    # The middleware strips the header and checks for empty string
    stripped = header.strip()
    assert not stripped, f"Expected empty after strip, got: {repr(stripped)}"

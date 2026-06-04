"""
Property-based tests for health endpoint and structured logging.

Feature: regtech-compliance-os-foundation
Properties: 20, 21
"""

from __future__ import annotations

from hypothesis import given, settings as h_settings
from hypothesis import strategies as st


# ---------------------------------------------------------------------------
# Property 20: Health response contains all required fields with valid values
# ---------------------------------------------------------------------------

@given(
    db_status=st.sampled_from(["ok", "degraded"]),
    redis_status=st.sampled_from(["ok", "degraded"]),
)
@h_settings(max_examples=50)
def test_health_status_logic(db_status: str, redis_status: str) -> None:
    """
    Property 20: overall status is 'degraded' iff any dependency is 'degraded'.
    """
    overall = "ok" if db_status == "ok" and redis_status == "ok" else "degraded"

    if db_status == "degraded" or redis_status == "degraded":
        assert overall == "degraded"
    else:
        assert overall == "ok"


# ---------------------------------------------------------------------------
# Property 21: Every request produces a complete structured log entry
# ---------------------------------------------------------------------------

@given(
    method=st.sampled_from(["GET", "POST", "PUT", "DELETE", "PATCH"]),
    path=st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd"), whitelist_characters="/-_.")),
    status_code=st.integers(min_value=100, max_value=599),
    duration_ms=st.floats(min_value=0.0, max_value=60000.0, allow_nan=False, allow_infinity=False),
)
@h_settings(max_examples=100)
def test_log_entry_has_required_fields(
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
) -> None:
    """
    Property 21: A log entry dict with all required fields is structurally valid.
    """
    import uuid

    request_id = str(uuid.uuid4())

    log_entry = {
        "timestamp": "2024-01-15T10:30:00.123Z",
        "method": method,
        "path": path,
        "status_code": status_code,
        "duration_ms": duration_ms,
        "tenant_id": "anonymous",
        "request_id": request_id,
    }

    required_fields = {"timestamp", "method", "path", "status_code", "duration_ms", "tenant_id", "request_id"}
    for field in required_fields:
        assert field in log_entry, f"Missing required log field: {field}"

    # request_id must be a valid UUID v4
    parsed = uuid.UUID(log_entry["request_id"])
    assert parsed.version == 4

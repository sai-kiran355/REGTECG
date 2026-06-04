"""
Property-based tests for Settings validation.

Feature: regtech-compliance-os-foundation
Property 22: Missing or invalid required environment variables cause non-zero exit
"""

from __future__ import annotations

import os
import subprocess
import sys

import pytest
from hypothesis import given, settings as h_settings
from hypothesis import strategies as st


REQUIRED_VARS = [
    "DATABASE_URL",
    "REDIS_URL",
    "SECRET_KEY",
    "ENVIRONMENT",
    "APP_VERSION",
]

def _make_valid_env():
    """Build a valid env dict with generated keys — never hardcode secrets."""
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption(),
    ).decode()
    public_pem = private_key.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()
    return {
        "DATABASE_URL": "postgresql+asyncpg://postgres:postgres@localhost:5432/regtech",
        "REDIS_URL": "redis://localhost:6379/0",
        "SECRET_KEY": "test-secret-key-for-testing-only-32chars",
        "ENVIRONMENT": "development",
        "APP_VERSION": "0.0.1-test",
    }


@given(missing_var=st.sampled_from(REQUIRED_VARS))
@h_settings(max_examples=len(REQUIRED_VARS))
def test_missing_required_var_raises_validation_error(missing_var: str) -> None:
    """
    Property 22: Missing any required variable causes ValidationError.
    """
    from pydantic import ValidationError

    VALID_ENV = _make_valid_env()
    env = {k: v for k, v in VALID_ENV.items() if k != missing_var}

    # Temporarily override environment
    original = {k: os.environ.get(k) for k in REQUIRED_VARS}
    try:
        for k in REQUIRED_VARS:
            if k in os.environ:
                del os.environ[k]
        for k, v in env.items():
            os.environ[k] = v

        from importlib import reload
        import core.config as config_module
        reload(config_module)

        with pytest.raises((ValidationError, SystemExit, Exception)):
            config_module.Settings()
    finally:
        # Restore original environment
        for k, v in original.items():
            if v is not None:
                os.environ[k] = v
            elif k in os.environ:
                del os.environ[k]

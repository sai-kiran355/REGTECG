"""
Smoke tests: validate that all required backend packages and frontend
directories exist on disk.
"""

from __future__ import annotations

from pathlib import Path

# Root of the repository (two levels up from this file)
REPO_ROOT = Path(__file__).resolve().parents[4]
BACKEND = REPO_ROOT / "backend"
FRONTEND = REPO_ROOT / "frontend"


def test_backend_packages_exist() -> None:
    """All required backend top-level packages must exist."""
    required = [
        "api",
        "core",
        "db",
        "models",
        "schemas",
        "services",
        "crud",
        "workers",
        "migrations",
        "tests",
    ]
    for pkg in required:
        assert (BACKEND / pkg).is_dir(), f"Missing backend package: {pkg}"


def test_backend_api_v1_exists() -> None:
    """The api/v1 sub-package must exist."""
    assert (BACKEND / "api" / "v1").is_dir(), "Missing backend/api/v1/"


def test_frontend_src_directories_exist() -> None:
    """All required frontend src/ sub-directories must exist."""
    required = ["api", "components", "pages", "hooks", "store", "utils"]
    for d in required:
        assert (FRONTEND / "src" / d).is_dir(), f"Missing frontend/src/{d}/"


def test_pyproject_toml_exists() -> None:
    """backend/pyproject.toml must exist."""
    assert (BACKEND / "pyproject.toml").is_file()


def test_alembic_ini_exists() -> None:
    """backend/alembic.ini must exist."""
    assert (BACKEND / "alembic.ini").is_file()


def test_dockerfile_exists() -> None:
    """backend/Dockerfile must exist."""
    assert (BACKEND / "Dockerfile").is_file()


def test_env_example_exists() -> None:
    """.env.example must exist at the repo root."""
    assert (REPO_ROOT / ".env.example").is_file()


def test_readme_exists() -> None:
    """README.md must exist at the repo root."""
    assert (REPO_ROOT / "README.md").is_file()

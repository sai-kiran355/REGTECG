#!/usr/bin/env bash
# Render build script — runs before the web service starts

set -e  # exit on any error

echo "==> Installing dependencies..."
pip install -e .

echo "==> Running database migrations..."
alembic upgrade head

echo "==> Build complete."

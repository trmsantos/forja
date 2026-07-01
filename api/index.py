"""Vercel Python serverless entrypoint.

Vercel's Python runtime serves the ASGI ``app`` exported here, so a single function handles every
``/api/*`` route. The whole backend lives in ``backend/app`` and is re-exported unchanged. Tables
are created lazily on the first cold start (guarded in main.py); the daily sweep + weekly recap run
via Vercel Cron hitting ``/api/cron/daily`` (see ``vercel.json``).
"""

import os
import sys

# Ensure the repo root (the parent of api/) is importable so `backend.app.main` resolves in the
# bundled function (backend/** is included via vercel.json's build config).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.main import app  # noqa: E402,F401  (Vercel detects and serves `app`)

"""Create all Postgres tables (idempotent). Run once against your DATABASE_URL:

    DATABASE_URL='postgresql://...neon.tech/...' python backend/scripts/init_db.py

Real environment variables take precedence; a local backend/.env is loaded as a convenience.
"""

import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(BACKEND / ".env")  # convenience for local runs; existing env vars win

from app.db import init_db  # noqa: E402

if __name__ == "__main__":
    init_db()
    print("init_db: all tables created (idempotent).")

"""Self-contained tests for the owner-only admin analytics gate.

Run from backend/ with the venv active:  python test_admin.py
Checks the is_admin flag (case-insensitive), the _require_admin gate, and that the metrics
endpoint returns the expected shape for an admin and 403s for everyone else. Read-only against
the DB (via DATABASE_URL) — seeds nothing.
"""

import sys

from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, ".")
from fastapi import HTTPException  # noqa: E402

from app.db import init_db  # noqa: E402
from app.main import ADMIN_EMAIL, _require_admin, _user_dict, admin_metrics  # noqa: E402

# ---- 1) is_admin flag is case-insensitive and exact ----
assert _user_dict({"id": 1, "name": "T", "email": ADMIN_EMAIL.upper(), "email_verified": 1})["is_admin"] is True
assert _user_dict({"id": 2, "name": "X", "email": "someone@else.com", "email_verified": 1})["is_admin"] is False
print("is_admin flag: PASS")

# ---- 2) the gate ----
try:
    _require_admin({"is_admin": False})
    raise AssertionError("non-admin must be blocked")
except HTTPException as exc:
    assert exc.status_code == 403, "non-admin -> 403"
_require_admin({"is_admin": True})  # admin passes (no raise)
print("admin gate: PASS")

# ---- 3) metrics payload shape (admin) + gate (non-admin) ----
init_db()
metrics = admin_metrics({"is_admin": True})
for key in ("users", "leads", "connections", "subscriptions", "conversion", "collections"):
    assert key in metrics, f"metrics missing '{key}'"
assert set(metrics["subscriptions"]) >= {"trialing", "active", "past_due", "canceled", "none"}, "subscription buckets"
assert "recovered_cents" in metrics["collections"] and "reminders_sent" in metrics["collections"], "collections fields"

try:
    admin_metrics({"is_admin": False})
    raise AssertionError("non-admin must not read metrics")
except HTTPException as exc:
    assert exc.status_code == 403, "non-admin metrics -> 403"
print("metrics payload + gate: PASS")
print("ALL ADMIN TESTS PASS")

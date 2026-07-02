"""Self-contained tests for the self-managed trial logic (auto-started on Stripe connect).

Run from backend/ with the venv active:  python test_billing.py
Pure-function checks for _sub_state plus a DB-backed check of _plan_is_active. Runs against
Postgres via DATABASE_URL (from backend/.env); seeds one throwaway user and cleans up.
"""

import sys
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, ".")
from app.db import get_conn, init_db  # noqa: E402
from app.main import _plan_is_active, _sub_state  # noqa: E402

NOW = datetime.now(timezone.utc)


def iso(dt):
    return dt.isoformat()


# ---- 1) _sub_state (pure) ----
assert _sub_state("active", None, None) == ("active", None), "active"
assert _sub_state("none", None, None) == ("none", None), "none"
assert _sub_state("canceled", None, "cus_x") == ("canceled", None), "canceled"

# self-managed trial (no stripe customer): active while in-window, expired otherwise
s, d = _sub_state("trialing", iso(NOW + timedelta(days=10)), None)
assert s == "trialing" and d is not None and 9 <= d <= 10, f"future self-trial active, got {s},{d}"
assert _sub_state("trialing", iso(NOW - timedelta(days=1)), None) == ("canceled", None), "past self-trial lapses"
assert _sub_state("trialing", None, None) == ("canceled", None), "self-trial with no end lapses"

# stripe-managed trial (has customer): trust the stored status even past the stamped end
assert _sub_state("trialing", iso(NOW - timedelta(days=1)), "cus_1")[0] == "trialing", "stripe trial trusted"
s, d = _sub_state("trialing", iso(NOW + timedelta(days=5)), "cus_1")
assert s == "trialing" and d is not None, "stripe trial future"
print("sub_state: PASS")

# ---- 2) _plan_is_active (DB-backed) ----
init_db()
EMAIL = "billing_test@forja.studio"
with get_conn() as c:
    c.execute("DELETE FROM users WHERE email = %s", (EMAIL,))
    uid = c.execute(
        "INSERT INTO users (name, email, password_hash, email_verified, created_at, subscription_status, trial_ends_at) "
        "VALUES (%s, %s, 'x', 1, %s, 'trialing', %s) RETURNING id",
        ("Billing Test", EMAIL, iso(NOW), iso(NOW + timedelta(days=3))),
    ).fetchone()["id"]

assert _plan_is_active(uid) is True, "unexpired self-managed trial -> chasing allowed"

with get_conn() as c:
    c.execute("UPDATE users SET trial_ends_at = %s WHERE id = %s", (iso(NOW - timedelta(days=1)), uid))
assert _plan_is_active(uid) is False, "expired self-managed trial -> chasing blocked"

with get_conn() as c:
    c.execute("DELETE FROM users WHERE email = %s", (EMAIL,))
print("plan_is_active: PASS")
print("ALL BILLING TESTS PASS")

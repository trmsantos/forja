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
from app.main import _plan_is_active, _set_subscription, _sub_state, _user_id_from_metadata  # noqa: E402

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

# ---- 3) webhook user resolution ----
assert _user_id_from_metadata({"metadata": {"forja_user_id": "7"}}) == 7, "reads user id from metadata"
assert _user_id_from_metadata({"metadata": {}}) is None, "no metadata -> None"
assert _user_id_from_metadata({"metadata": {"forja_user_id": "nope"}}) is None, "non-int -> None"
assert _user_id_from_metadata({}) is None, "missing metadata -> None"

EMAIL2 = "billing_hook_test@forja.studio"
with get_conn() as c:
    c.execute("DELETE FROM users WHERE email = %s", (EMAIL2,))
    uid2 = c.execute(
        "INSERT INTO users (name, email, password_hash, email_verified, created_at) "
        "VALUES (%s, %s, 'x', 1, %s) RETURNING id",
        ("Hook Test", EMAIL2, iso(NOW)),
    ).fetchone()["id"]

# resolve by user_id (subscription metadata path): sets status AND links the customer id
_set_subscription("cus_ABC", "active", None, user_id=uid2)
with get_conn() as c:
    row = c.execute("SELECT subscription_status, stripe_customer_id FROM users WHERE id = %s", (uid2,)).fetchone()
assert row["subscription_status"] == "active" and row["stripe_customer_id"] == "cus_ABC", f"user_id resolution, got {row}"

# resolve by customer_id (a later event carrying no user_id): flips the status
_set_subscription("cus_ABC", "past_due", None)
with get_conn() as c:
    st = c.execute("SELECT subscription_status FROM users WHERE id = %s", (uid2,)).fetchone()["subscription_status"]
assert st == "past_due", f"customer_id resolution, got {st}"

with get_conn() as c:
    c.execute("DELETE FROM users WHERE email = %s", (EMAIL2,))
print("webhook resolution: PASS")
print("ALL BILLING TESTS PASS")

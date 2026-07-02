"""Self-contained tests for connection-health hardening.

Run from backend/ with the venv active:  python test_hardening.py
Checks the auth-error classifier and that a revoked key marks the connection 'error' (so the
sweep stops retrying and the dashboard can prompt a reconnect), while a transient error doesn't.
Runs against Postgres via DATABASE_URL; seeds a throwaway user + connection and cleans up.
"""

import sys
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, ".")
import app.collections_agent as ca  # noqa: E402
from app.db import get_conn, init_db  # noqa: E402
from app.security import encrypt_secret  # noqa: E402

NOW = datetime.now(timezone.utc)


def iso(dt):
    return dt.isoformat()


class _StripeErr(Exception):
    def __init__(self, status):
        super().__init__(f"stripe {status}")
        self.http_status = status


def _raise(status):
    def f(_uid, _key):
        raise _StripeErr(status)

    return f


# ---- 1) auth-error classification (401/403 = dead key; others = transient) ----
assert ca._is_auth_error(_StripeErr(401)) is True, "401 -> auth error"
assert ca._is_auth_error(_StripeErr(403)) is True, "403 -> auth error"
assert ca._is_auth_error(_StripeErr(500)) is False, "500 -> transient"
assert ca._is_auth_error(Exception("network down")) is False, "no status -> transient"
print("auth classification: PASS")

# ---- 2) revoked key marks the connection 'error'; transient leaves it 'active' ----
init_db()
EMAIL = "hardening_test@forja.studio"
with get_conn() as c:
    c.execute("DELETE FROM users WHERE email = %s", (EMAIL,))
    uid = c.execute(
        "INSERT INTO users (name, email, password_hash, email_verified, created_at, subscription_status) "
        "VALUES (%s, %s, 'x', 1, %s, 'active') RETURNING id",
        ("Hardening", EMAIL, iso(NOW)),
    ).fetchone()["id"]
    c.execute(
        "INSERT INTO connections (user_id, encrypted_key, status, created_at) VALUES (%s, %s, 'active', %s)",
        (uid, encrypt_secret("rk_test_dummy"), iso(NOW)),
    )


def conn_row():
    with get_conn() as c:
        return c.execute("SELECT status, error_reason FROM connections WHERE user_id = %s", (uid,)).fetchone()


_orig = ca.sync_invoices
try:
    # transient (500) -> connection stays active so the next sweep retries
    ca.sync_invoices = _raise(500)
    ca.run_sweep(user_id=uid, dry_run=True)
    assert conn_row()["status"] == "active", "transient error must leave the connection active"

    # auth (401) -> connection flagged 'error' with a reason
    ca.sync_invoices = _raise(401)
    ca.run_sweep(user_id=uid, dry_run=True)
    row = conn_row()
    assert row["status"] == "error" and row["error_reason"], f"auth error must flag 'error', got {row}"
finally:
    ca.sync_invoices = _orig

with get_conn() as c:
    c.execute("DELETE FROM users WHERE email = %s", (EMAIL,))
print("connection health: PASS")
print("ALL HARDENING TESTS PASS")

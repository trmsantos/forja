"""Self-contained test: a paused invoice is excluded from the sweep, and re-including it resumes
chasing.

Run from backend/ with the venv active:  python test_invoice_control.py
Seeds a throwaway user + connection + one overdue invoice, stubs the Stripe re-sync, runs the
sweep in dry-run, and asserts the pause flag is honored. Cleans up after.
"""

import sys
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, ".")
import app.collections_agent as ca  # noqa: E402
from app.db import get_conn, init_db  # noqa: E402
from app.security import encrypt_secret  # noqa: E402

NOW = datetime.now(timezone.utc)


def iso(dt):
    return dt.isoformat()


init_db()
EMAIL = "invctrl_test@forja.studio"
with get_conn() as c:
    c.execute("DELETE FROM users WHERE email = %s", (EMAIL,))
    uid = c.execute(
        "INSERT INTO users (name, email, password_hash, email_verified, created_at, subscription_status) "
        "VALUES (%s, %s, 'x', 1, %s, 'active') RETURNING id",
        ("InvCtrl", EMAIL, iso(NOW)),
    ).fetchone()["id"]
    c.execute(
        "INSERT INTO connections (user_id, encrypted_key, status, created_at) VALUES (%s, %s, 'active', %s)",
        (uid, encrypt_secret("rk_test_x"), iso(NOW)),
    )
    # one overdue, chaseable invoice — but paused
    c.execute(
        "INSERT INTO tracked_invoices (user_id, stripe_invoice_id, customer_email, amount_due, currency, "
        "due_date, status, reminder_step, chase_paused, created_at, updated_at) "
        "VALUES (%s, 'in_test', 'debtor@example.com', 120000, 'eur', %s, 'open', 0, 1, %s, %s)",
        (uid, iso(NOW - timedelta(days=10)), iso(NOW), iso(NOW)),
    )

# Stub the Stripe re-sync so the sweep touches no network and doesn't overwrite our seed row.
_orig = ca.sync_invoices
ca.sync_invoices = lambda _u, _k: {"synced": 0}
try:
    r = ca.run_sweep(user_id=uid, dry_run=True)
    assert r["reminders"] == 0, f"a paused invoice must not be chased, got {r}"

    with get_conn() as c:
        c.execute("UPDATE tracked_invoices SET chase_paused = 0 WHERE user_id = %s", (uid,))
    r = ca.run_sweep(user_id=uid, dry_run=True)
    assert r["reminders"] == 1, f"an un-paused overdue invoice must be chased, got {r}"
finally:
    ca.sync_invoices = _orig

with get_conn() as c:
    c.execute("DELETE FROM users WHERE email = %s", (EMAIL,))
print("invoice pause: PASS")
print("ALL INVOICE-CONTROL TESTS PASS")

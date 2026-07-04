"""Self-contained test for account deletion (GDPR erasure).

Run from backend/ with the venv active:  python test_account_deletion.py
Function-level: calls the delete_account handler directly with a fake user dict. Seeds one throwaway
user plus one row in every table that references them (connection, tracked invoice, reminder, and
the email-keyed leads/payments), confirms the wrong password is rejected, then that a correct
password erases the user and every associated row. Runs against Postgres via DATABASE_URL.
"""

import sys
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, ".")
from fastapi import HTTPException  # noqa: E402

from app.db import get_conn, init_db  # noqa: E402
from app.main import DeleteAccountIn, delete_account  # noqa: E402
from app.security import encrypt_secret, hash_password  # noqa: E402

init_db()

EMAIL = "delete_test@forja.studio"
PW = "delete-me-1"
NOW = datetime.now(timezone.utc).isoformat()

with get_conn() as c:
    c.execute("DELETE FROM users WHERE email = %s", (EMAIL,))
    c.execute("DELETE FROM leads WHERE email = %s", (EMAIL,))
    c.execute("DELETE FROM payments WHERE email = %s", (EMAIL,))
    uid = c.execute(
        "INSERT INTO users (name, email, password_hash, email_verified, created_at) "
        "VALUES (%s, %s, %s, 1, %s) RETURNING id",
        ("Delete Me", EMAIL, hash_password(PW), NOW),
    ).fetchone()["id"]
    c.execute(
        "INSERT INTO connections (user_id, encrypted_key, status, created_at) VALUES (%s, %s, 'active', %s)",
        (uid, encrypt_secret("rk_test_del"), NOW),
    )
    inv_id = c.execute(
        "INSERT INTO tracked_invoices (user_id, stripe_invoice_id, amount_due, currency, status, "
        "reminder_step, created_at, updated_at) "
        "VALUES (%s, 'in_del', 5000, 'eur', 'open', 1, %s, %s) RETURNING id",
        (uid, NOW, NOW),
    ).fetchone()["id"]
    c.execute(
        "INSERT INTO reminders_sent (invoice_id, user_id, step, sent_at) VALUES (%s, %s, 1, %s)",
        (inv_id, uid, NOW),
    )
    c.execute(
        "INSERT INTO leads (name, email, message, at) VALUES (%s, %s, %s, %s)",
        ("Delete Me", EMAIL, "hi", NOW),
    )
    c.execute(
        "INSERT INTO payments (email, description, amount, currency, status, stripe_id, at) "
        "VALUES (%s, 'x', 100, 'eur', 'paid', %s, %s)",
        (EMAIL, "pay_del_test", NOW),
    )

user = {"id": uid}


def counts():
    with get_conn() as c:
        return {
            "users": c.execute("SELECT COUNT(*) AS n FROM users WHERE id = %s", (uid,)).fetchone()["n"],
            "connections": c.execute("SELECT COUNT(*) AS n FROM connections WHERE user_id = %s", (uid,)).fetchone()["n"],
            "invoices": c.execute("SELECT COUNT(*) AS n FROM tracked_invoices WHERE user_id = %s", (uid,)).fetchone()["n"],
            "reminders": c.execute("SELECT COUNT(*) AS n FROM reminders_sent WHERE user_id = %s", (uid,)).fetchone()["n"],
            "leads": c.execute("SELECT COUNT(*) AS n FROM leads WHERE email = %s", (EMAIL,)).fetchone()["n"],
            "payments": c.execute("SELECT COUNT(*) AS n FROM payments WHERE email = %s", (EMAIL,)).fetchone()["n"],
        }


try:
    # ---- 1) the wrong password is rejected and deletes nothing ----
    try:
        delete_account(DeleteAccountIn(password="not-the-password"), user)
        raise AssertionError("a wrong password must not delete the account")
    except HTTPException as exc:
        assert exc.status_code == 400, "wrong password -> 400"
    before = counts()
    assert before["users"] == 1, "the user still exists after a rejected delete"
    print("wrong password rejected: PASS")

    # ---- 2) the correct password erases the user and every associated row ----
    out = delete_account(DeleteAccountIn(password=PW), user)
    assert out == {"ok": True}, "correct password -> ok"
    after = counts()
    assert after == {
        "users": 0,
        "connections": 0,
        "invoices": 0,
        "reminders": 0,
        "leads": 0,
        "payments": 0,
    }, f"every row for the user must be gone, got {after}"
    print("full erasure: PASS")
finally:
    with get_conn() as c:
        c.execute("DELETE FROM users WHERE email = %s", (EMAIL,))
        c.execute("DELETE FROM leads WHERE email = %s", (EMAIL,))
        c.execute("DELETE FROM payments WHERE email = %s", (EMAIL,))

print("ALL ACCOUNT-DELETION TESTS PASS")

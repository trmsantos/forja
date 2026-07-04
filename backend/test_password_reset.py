"""Self-contained tests for the forgot/reset-password flow.

Run from backend/ with the venv active:  python test_password_reset.py
Function-level (no HTTP server): calls the route handlers directly, stubbing send_email so nothing
is emailed. Runs against Postgres via DATABASE_URL (loaded from backend/.env), seeds one throwaway
user, asserts, then cleans up.
"""

import sys
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()  # load DATABASE_URL before app.db reads it at import

sys.path.insert(0, ".")
from fastapi import HTTPException  # noqa: E402

import app.main as m  # noqa: E402
from app.db import get_conn, init_db  # noqa: E402
from app.email import password_reset_html  # noqa: E402
from app.main import ForgotPasswordIn, ResetPasswordIn, forgot_password, reset_password  # noqa: E402
from app.security import create_email_token, hash_password, verify_password  # noqa: E402

init_db()

EMAIL = "pwreset_test@forja.studio"
ORIG_PW = "orig-password-1"

with get_conn() as c:
    c.execute("DELETE FROM users WHERE email = %s", (EMAIL,))  # clean slate
    uid = c.execute(
        "INSERT INTO users (name, email, password_hash, email_verified, created_at) "
        "VALUES (%s, %s, %s, 1, %s) RETURNING id",
        ("Reset Me", EMAIL, hash_password(ORIG_PW), datetime.now(timezone.utc).isoformat()),
    ).fetchone()["id"]

# Stub send_email so the flow never sends and we can observe whether it *tried* to.
_sent: list = []
_orig_send = m.send_email
m.send_email = lambda to, subject, html, reply_to=None: (_sent.append((to, subject, html)) or True)

try:
    # ---- 1) forgot-password for a real account: 200 + a reset email is attempted ----
    out = forgot_password(ForgotPasswordIn(email=EMAIL))
    assert out == {"ok": True}, "forgot-password always returns ok"
    assert len(_sent) == 1 and _sent[0][0] == EMAIL, "a reset email is sent to the account address"
    assert "/reset-password?token=" in _sent[0][2], "the email links to the reset page with a token"

    # ---- 2) forgot-password for an unknown email: still 200, but no email (no existence leak) ----
    out = forgot_password(ForgotPasswordIn(email="nobody-here@forja.studio"))
    assert out == {"ok": True}, "unknown email still returns ok (don't leak account existence)"
    assert len(_sent) == 1, "no email is sent for an address with no account"

    # ---- 3) reset-password with a valid reset token changes the password ----
    token = create_email_token(uid, "reset", ttl_hours=1)
    out = reset_password(ResetPasswordIn(token=token, new_password="brand-new-9"))
    assert out == {"ok": True}, "valid token -> ok"
    with get_conn() as c:
        h = c.execute("SELECT password_hash FROM users WHERE id = %s", (uid,)).fetchone()["password_hash"]
    assert verify_password("brand-new-9", h), "new password verifies after reset"
    assert not verify_password(ORIG_PW, h), "old password no longer works after reset"
    print("reset happy path: PASS")

    # ---- 4) a garbage token is rejected with 400 ----
    try:
        reset_password(ResetPasswordIn(token="not-a-real-token", new_password="another-pass-1"))
        raise AssertionError("an invalid reset token must be rejected")
    except HTTPException as exc:
        assert exc.status_code == 400, "invalid token -> 400"

    # ---- 5) a token minted for a different purpose (email verify) is rejected ----
    wrong_purpose = create_email_token(uid, "verify")
    try:
        reset_password(ResetPasswordIn(token=wrong_purpose, new_password="another-pass-2"))
        raise AssertionError("a non-reset token must not be accepted for password reset")
    except HTTPException as exc:
        assert exc.status_code == 400, "wrong-purpose token -> 400"
    print("reset token validation: PASS")
finally:
    m.send_email = _orig_send
    with get_conn() as c:
        c.execute("DELETE FROM users WHERE email = %s", (EMAIL,))

# ---- 6) the email template embeds the reset link ----
link = "https://example.com/reset-password?token=abc"
assert link in password_reset_html("Reset Me", link), "template includes the reset link"
print("email template: PASS")

print("ALL PASSWORD-RESET TESTS PASS")

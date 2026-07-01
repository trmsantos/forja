"""Self-contained tests for the profile & account-settings endpoints.

Run from backend/ with the venv active:  python test_profile.py
Function-level (no HTTP server): calls the route handlers directly with a fake user dict, so
there's no dependency on a test client. Runs against Postgres via DATABASE_URL (loaded from
backend/.env), seeds one throwaway user, asserts, then cleans up.
"""

import sys
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()  # load DATABASE_URL before app.db reads it at import

sys.path.insert(0, ".")
from fastapi import HTTPException  # noqa: E402

from app.db import get_conn, init_db  # noqa: E402
from app.main import (  # noqa: E402
    ALLOWED_AVATAR_TYPES,
    PasswordIn,
    ProfileIn,
    change_password,
    update_profile,
)
from app.security import hash_password, verify_password  # noqa: E402

init_db()

EMAIL = "profile_test@forja.studio"
ORIG_PW = "orig-password-1"

with get_conn() as c:
    c.execute("DELETE FROM users WHERE email = %s", (EMAIL,))  # clean slate
    uid = c.execute(
        "INSERT INTO users (name, email, password_hash, email_verified, created_at) "
        "VALUES (%s, %s, %s, 1, %s) RETURNING id",
        ("Orig Name", EMAIL, hash_password(ORIG_PW), datetime.now(timezone.utc).isoformat()),
    ).fetchone()["id"]

user = {"id": uid}

# ---- 1) profile update: name + display_name persist and come back ----
res = update_profile(ProfileIn(name="New Name", display_name="Nick"), user)
assert res["name"] == "New Name" and res["display_name"] == "Nick", "update returns new fields"
with get_conn() as c:
    row = c.execute("SELECT name, display_name FROM users WHERE id = %s", (uid,)).fetchone()
assert row["name"] == "New Name" and row["display_name"] == "Nick", "profile persisted to DB"

# blank display_name normalises to NULL (so the greeting falls back to name)
res = update_profile(ProfileIn(name="New Name", display_name="   "), user)
assert res["display_name"] is None, "blank display_name -> NULL"
print("profile update: PASS")

# ---- 2) password change: wrong current rejected, correct one applied ----
try:
    change_password(PasswordIn(current_password="not-it", new_password="brand-new-1"), user)
    raise AssertionError("wrong current password should raise 400")
except HTTPException as exc:
    assert exc.status_code == 400, "wrong current -> 400"

out = change_password(PasswordIn(current_password=ORIG_PW, new_password="brand-new-1"), user)
assert out == {"ok": True}, "correct current -> ok"
with get_conn() as c:
    h = c.execute("SELECT password_hash FROM users WHERE id = %s", (uid,)).fetchone()["password_hash"]
assert verify_password("brand-new-1", h), "new password verifies"
assert not verify_password(ORIG_PW, h), "old password no longer works"
print("password change: PASS")

# ---- 3) avatar config sanity ----
assert ALLOWED_AVATAR_TYPES.get("image/png") == "png", "png accepted"
assert "image/svg+xml" not in ALLOWED_AVATAR_TYPES, "svg not accepted (XSS surface)"
print("avatar config: PASS")

# cleanup
with get_conn() as c:
    c.execute("DELETE FROM users WHERE email = %s", (EMAIL,))
print("ALL PROFILE TESTS PASS")

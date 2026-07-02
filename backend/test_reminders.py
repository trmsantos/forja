"""Self-contained tests for reminder settings, tone, and preview.

Run from backend/ with the venv active:  python test_reminders.py
Pure checks for tone/cadence plus DB-backed checks of the settings + preview handlers (called
directly with a fake user, like test_profile.py). Runs against Postgres via DATABASE_URL.
"""

import sys
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, ".")
from app.collections_agent import next_reminder_step  # noqa: E402
from app.db import get_conn, init_db  # noqa: E402
from app.email import reminder_html  # noqa: E402
from app.main import (  # noqa: E402
    ReminderSettingsIn,
    get_reminder_settings,
    preview_reminders,
    update_reminder_settings,
)
from app.security import hash_password  # noqa: E402

NOW = datetime.now(timezone.utc)


def iso(dt):
    return dt.isoformat()


# ---- 1) tone changes the copy ----
friendly = reminder_html(1, "Acme", "Jo", "100.00 EUR", 5, "https://x", tone="friendly")
firm = reminder_html(1, "Acme", "Jo", "100.00 EUR", 5, "https://x", tone="firm")
assert friendly != firm, "tone must change the copy"
assert "friendly reminder" in friendly and "friendly reminder" not in firm, "friendly vs firm wording"
print("tone copy: PASS")

# ---- 2) next_reminder_step honors a custom gap ----
inv = {
    "status": "open",
    "due_date": iso(NOW - timedelta(days=20)),
    "reminder_step": 1,
    "last_reminder_at": iso(NOW - timedelta(days=5)),
}
assert next_reminder_step(inv, NOW, gap_days=7) is None, "5 days since last < 7-day gap -> skip"
assert next_reminder_step(inv, NOW, gap_days=3) == 2, "5 days since last >= 3-day gap -> step 2"
print("custom cadence: PASS")

# ---- 3) settings round-trip + preview (DB-backed) ----
init_db()
EMAIL = "reminders_test@forja.studio"
with get_conn() as c:
    c.execute("DELETE FROM users WHERE email = %s", (EMAIL,))
    uid = c.execute(
        "INSERT INTO users (name, email, password_hash, email_verified, created_at) "
        "VALUES (%s, %s, %s, 1, %s) RETURNING id",
        ("Reminder Test", EMAIL, hash_password("password1"), iso(NOW)),
    ).fetchone()["id"]
user = {"id": uid}

# no settings yet -> fall back to name / friendly / default gap
s = get_reminder_settings(user)
assert s["business_name"] == "Reminder Test" and s["tone"] == "friendly", f"defaults, got {s}"

out = update_reminder_settings(ReminderSettingsIn(business_name="Studio Forge", tone="firm", gap_days=10), user)
assert out["business_name"] == "Studio Forge" and out["tone"] == "firm" and out["gap_days"] == 10, f"update, got {out}"

# an unknown tone normalises to friendly (never trust the client)
bad = update_reminder_settings(ReminderSettingsIn(business_name="Studio Forge", tone="aggressive", gap_days=10), user)
assert bad["tone"] == "friendly", "invalid tone -> friendly"

prev = preview_reminders(user)
assert len(prev["steps"]) == 3, "preview renders all three steps"
assert all("Studio Forge" in st["html"] for st in prev["steps"]), "preview uses the sender name"
print("settings + preview: PASS")

with get_conn() as c:
    c.execute("DELETE FROM users WHERE email = %s", (EMAIL,))
print("ALL REMINDER TESTS PASS")

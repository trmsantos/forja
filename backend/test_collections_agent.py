"""Self-contained tests for the Collections Agent.

Run from backend/ with the venv active:  python test_collections_agent.py
Runs against Postgres via DATABASE_URL (loaded from backend/.env). Seeds throwaway users,
stubs the Stripe sync, asserts behavior, then cleans up.
"""

import sys
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

load_dotenv()  # load DATABASE_URL (and friends) from backend/.env before app.db reads it at import

sys.path.insert(0, ".")
from app.db import init_db, get_conn  # noqa: E402
from app.security import encrypt_secret  # noqa: E402
from app import collections_agent as ca  # noqa: E402

NOW = datetime(2026, 6, 26, 12, 0, tzinfo=timezone.utc)


def iso(dt):
    return dt.isoformat()


def _new_user(c, name, email):
    """Insert a throwaway verified user, returning its id (Postgres RETURNING, not lastrowid)."""
    return c.execute(
        "INSERT INTO users (name, email, password_hash, email_verified, created_at) "
        "VALUES (%s, %s, 'x', 1, %s) RETURNING id",
        (name, email, iso(NOW)),
    ).fetchone()["id"]


# ---- 1) pure decision logic (no DB, no Stripe) ----
def inv(**kw):
    base = {"status": "open", "due_date": iso(NOW - timedelta(days=10)), "reminder_step": 0, "last_reminder_at": None}
    base.update(kw)
    return base


assert ca.next_reminder_step(inv(), NOW) == 1, "overdue step0 -> 1"
assert ca.next_reminder_step(inv(status="paid"), NOW) is None, "paid -> skip"
assert ca.next_reminder_step(inv(due_date=None), NOW) is None, "no due date -> skip"
assert ca.next_reminder_step(inv(due_date=iso(NOW + timedelta(days=3))), NOW) is None, "not overdue -> skip"
assert ca.next_reminder_step(inv(reminder_step=3), NOW) is None, "maxed -> skip"
assert ca.next_reminder_step(inv(reminder_step=1, last_reminder_at=iso(NOW - timedelta(days=2))), NOW) is None, "gap<7 -> skip"
assert ca.next_reminder_step(inv(reminder_step=1, last_reminder_at=iso(NOW - timedelta(days=10))), NOW) == 2, "gap ok -> 2"
print("decision logic: PASS")

# ---- 1b) reminder HTML escapes untrusted names/URL ----
from app.email import reminder_html  # noqa: E402

h = reminder_html(1, "<script>Acme</script>", "O'Brien <b>", "100.00 EUR", 5, "https://x?a=1&b=2")
assert "<script>" not in h and "&lt;script&gt;" in h, "studio name must be HTML-escaped"
assert "&lt;b&gt;" in h, "debtor name must be HTML-escaped"
print("email escaping: PASS")

# ---- 2) run_sweep end-to-end (dry-run, Stripe sync stubbed) ----
init_db()
EMAIL = "collections_test@forja.studio"
with get_conn() as c:
    c.execute("DELETE FROM users WHERE email = %s", (EMAIL,))  # clean slate (cascades)
    uid = _new_user(c, "Test Studio", EMAIL)
    # The collections engine is paywalled — the sweep only touches subscribed users.
    c.execute("UPDATE users SET subscription_status = 'active' WHERE id = %s", (uid,))
    c.execute(
        "INSERT INTO connections (user_id, encrypted_key, status, created_at) VALUES (%s, %s, %s, %s)",
        (uid, encrypt_secret("rk_test"), "active", iso(NOW)),
    )

    def mkinv(sid, **kw):
        d = {"customer_email": "ap@acme.test", "due_date": iso(NOW - timedelta(days=10)),
             "status": "open", "reminder_step": 0, "last_reminder_at": None}
        d.update(kw)
        c.execute(
            "INSERT INTO tracked_invoices (user_id, stripe_invoice_id, customer_name, customer_email, amount_due, "
            "currency, due_date, hosted_invoice_url, status, reminder_step, last_reminder_at, created_at, updated_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (uid, sid, "Acme", d["customer_email"], 50000, "eur", d["due_date"], "https://pay/" + sid,
             d["status"], d["reminder_step"], d["last_reminder_at"], iso(NOW), iso(NOW)),
        )

    mkinv("a_due")                                                                  # -> step 1
    mkinv("b_gap", reminder_step=1, last_reminder_at=iso(NOW - timedelta(days=2)))   # skip (gap)
    mkinv("c_step2", reminder_step=1, last_reminder_at=iso(NOW - timedelta(days=10)))  # -> step 2
    mkinv("d_future", due_date=iso(NOW + timedelta(days=5)))                          # skip (not due)
    mkinv("e_paid", status="paid")                                                    # skip (paid)
    mkinv("f_nodue", due_date=None)                                                   # skip (no due date)
    mkinv("g_maxed", reminder_step=3)                                                 # skip (maxed)

ca.sync_invoices = lambda user_id, key: {"synced": 0, "reconciled": 0}  # stub: no network

summary = ca.run_sweep(user_id=uid, dry_run=True)
print("summary:", summary)
assert summary["connections"] == 1, summary
assert summary["reminders"] == 2, f"expected 2 reminders, got {summary['reminders']}"
assert summary["skipped"] == 4, f"expected 4 skipped, got {summary['skipped']}"

with get_conn() as c:
    def step(sid):
        return c.execute("SELECT reminder_step FROM tracked_invoices WHERE user_id=%s AND stripe_invoice_id=%s", (uid, sid)).fetchone()["reminder_step"]
    assert step("a_due") == 1, step("a_due")
    assert step("c_step2") == 2, step("c_step2")
    assert step("b_gap") == 1, "b_gap unchanged"
    assert step("g_maxed") == 3, "g_maxed unchanged"
    n = c.execute("SELECT COUNT(*) AS n FROM reminders_sent WHERE user_id=%s", (uid,)).fetchone()["n"]
    assert n == 2, n
print("run_sweep: PASS")

# ---- 3) idempotent re-run: nothing is due again so soon ----
summary2 = ca.run_sweep(user_id=uid, dry_run=True)
assert summary2["reminders"] == 0, f"re-run should send 0, got {summary2['reminders']}"
print("idempotent re-run: PASS")

# ---- 4) regression: Stripe object field access survives stripe-python v15 ----
# stripe-python v15's StripeObject dropped dict-style .get(); upsert_invoice used to call
# inv.get(...) and blew up with "AttributeError: get" the first time a real invoice synced
# (it stayed hidden while every sweep had 0 invoices). This pins the subscript-based _field()
# accessor so a future SDK bump can't silently rebreak sync again.
from app.stripe_sync import _field, upsert_invoice  # noqa: E402


class _FakeStripeObject:
    """Mimics a stripe-python v15 Invoice: supports obj["key"] but NOT obj.get()
    (unknown attributes fall through to keys, so .get raises AttributeError)."""

    def __init__(self, data):
        self._data = data

    def __getitem__(self, key):
        return self._data[key]  # raises KeyError when absent, like StripeObject

    def __getattr__(self, key):
        try:
            return self._data[key]
        except KeyError:
            raise AttributeError(key)


_fake = _FakeStripeObject({"currency": "eur"})
# guard: the fake must reproduce v15 (no .get), else the test would prove nothing
try:
    _fake.get("currency")
    raise AssertionError("FakeStripeObject must not support .get() — it should mimic stripe v15")
except AttributeError:
    pass
assert _field(_fake, "currency") == "eur", "_field reads present keys via subscript"
assert _field(_fake, "missing") is None, "_field defaults a missing key to None"
assert _field(_fake, "missing", "fallback") == "fallback", "_field honors an explicit default"

_due = NOW - timedelta(days=3)
_inv = _FakeStripeObject({
    "id": "regress_field", "customer_name": "Régrèss", "customer_email": "r@acme.test",
    "amount_due": 12345, "currency": "eur", "due_date": int(_due.timestamp()),
    "hosted_invoice_url": "https://pay/regress",
})
with get_conn() as c:
    upsert_invoice(c, uid, _inv, iso(NOW))  # must NOT raise "AttributeError: get"
    r = c.execute(
        "SELECT customer_name, customer_email, amount_due, currency, due_date, hosted_invoice_url "
        "FROM tracked_invoices WHERE user_id=%s AND stripe_invoice_id='regress_field'", (uid,),
    ).fetchone()
assert r is not None, "upsert_invoice must insert the synced row"
assert r["amount_due"] == 12345 and r["currency"] == "eur", dict(r)
assert r["customer_email"] == "r@acme.test", dict(r)
assert r["due_date"].startswith(_due.date().isoformat()), r["due_date"]
print("stripe field access (v15 regression): PASS")

# ---- 5) paywall: a user without an active/trialing subscription is never swept ----
UNSUB_EMAIL = "collections_unsub@forja.studio"
with get_conn() as c:
    c.execute("DELETE FROM users WHERE email = %s", (UNSUB_EMAIL,))
    unsub_uid = _new_user(c, "No Plan", UNSUB_EMAIL)
    # subscription_status stays at its 'none' default — i.e. not paying.
    c.execute(
        "INSERT INTO connections (user_id, encrypted_key, status, created_at) VALUES (%s, %s, %s, %s)",
        (unsub_uid, encrypt_secret("rk_test"), "active", iso(NOW)),
    )
    c.execute(
        "INSERT INTO tracked_invoices (user_id, stripe_invoice_id, customer_name, customer_email, amount_due, "
        "currency, due_date, hosted_invoice_url, status, reminder_step, last_reminder_at, created_at, updated_at) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (unsub_uid, "unsub_overdue", "Acme", "ap@acme.test", 50000, "eur",
         iso(NOW - timedelta(days=10)), "https://pay/unsub", "open", 0, None, iso(NOW), iso(NOW)),
    )

unsub_summary = ca.run_sweep(user_id=unsub_uid, dry_run=True)
assert unsub_summary["connections"] == 0, f"unsubscribed user must be skipped, got {unsub_summary}"
assert unsub_summary["reminders"] == 0, unsub_summary
with get_conn() as c:
    c.execute("DELETE FROM users WHERE id = %s", (unsub_uid,))
print("paywall gating: PASS")

# ---- 6) weekly recap: selects only subscribed users, with correct weekly totals (no network) ----
RECAP_SUB = "recap_subbed@forja.studio"
RECAP_FREE = "recap_free@forja.studio"
with get_conn() as c:
    for em in (RECAP_SUB, RECAP_FREE):
        c.execute("DELETE FROM users WHERE email = %s", (em,))
    sub_id = _new_user(c, "Sub Studio", RECAP_SUB)
    c.execute("UPDATE users SET subscription_status = 'active' WHERE id = %s", (sub_id,))
    free_id = _new_user(c, "Free Studio", RECAP_FREE)  # stays subscription_status='none' — must be excluded

    def rinv(owner, sid, status, amount, updated):
        c.execute(
            "INSERT INTO tracked_invoices (user_id, stripe_invoice_id, customer_name, customer_email, amount_due, "
            "currency, due_date, hosted_invoice_url, status, reminder_step, last_reminder_at, created_at, updated_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (owner, sid, "C", "c@x.test", amount, "eur", iso(NOW - timedelta(days=10)),
             "https://pay/" + sid, status, 0, None, iso(NOW), updated),
        )

    rinv(sub_id, "rs_open1", "open", 10000, iso(NOW))
    rinv(sub_id, "rs_open2", "open", 20000, iso(NOW))
    rinv(sub_id, "rs_paid_recent", "paid", 50000, iso(NOW - timedelta(days=2)))   # recovered this week
    rinv(sub_id, "rs_paid_old", "paid", 99999, iso(NOW - timedelta(days=30)))     # outside the 7-day window
    rinv(free_id, "rf_open", "open", 70000, iso(NOW))                             # free user — must be excluded

    open1_id = c.execute(
        "SELECT id FROM tracked_invoices WHERE user_id=%s AND stripe_invoice_id='rs_open1'", (sub_id,)
    ).fetchone()["id"]
    for label, sent in [("a", NOW - timedelta(days=1)), ("b", NOW - timedelta(days=3)), ("c", NOW - timedelta(days=20))]:
        c.execute(
            "INSERT INTO reminders_sent (invoice_id, user_id, step, channel, to_email, subject, sent_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (open1_id, sub_id, 1, "email", "c@x.test", "subj-" + label, iso(sent)),
        )

recaps = ca.collect_recaps(NOW)
by_email = {r["email"]: r for r in recaps}
assert RECAP_SUB in by_email, "subscribed user must get a recap"
assert RECAP_FREE not in by_email, "non-subscribed user must be excluded from recaps"
sub = by_email[RECAP_SUB]
assert sub["outstanding"] == 30000, sub            # 10000 + 20000 open
assert sub["recovered_this_week"] == 50000, sub    # only the invoice paid within the window
assert sub["reminders_this_week"] == 2, sub        # only the two reminders within 7 days
assert sub["open_count"] == 2, sub
recap_summary = ca.run_weekly_recap(dry_run=True)  # dry-run: logs, sends nothing
assert recap_summary["dry_run"] is True and recap_summary["recipients"] >= 1, recap_summary
print("weekly recap selection + totals: PASS")

with get_conn() as c:
    for em in (RECAP_SUB, RECAP_FREE):
        c.execute("DELETE FROM users WHERE email = %s", (em,))

with get_conn() as c:
    c.execute("DELETE FROM users WHERE id = %s", (uid,))  # cascade cleans connection/invoices/reminders
print("\nALL COLLECTIONS TESTS PASSED")

"""Self-contained tests for the Collections Agent.

Run from backend/ with the venv active:  python test_collections_agent.py
Seeds a throwaway user in forja.db, stubs the Stripe sync, asserts behavior, cleans up.
"""

import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, ".")
from app.db import init_db, get_conn  # noqa: E402
from app.security import encrypt_secret  # noqa: E402
from app import collections_agent as ca  # noqa: E402

NOW = datetime(2026, 6, 26, 12, 0, tzinfo=timezone.utc)


def iso(dt):
    return dt.isoformat()


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
    c.execute("DELETE FROM users WHERE email = ?", (EMAIL,))  # clean slate (cascades)
    uid = c.execute(
        "INSERT INTO users (name, email, password_hash, email_verified, created_at) VALUES (?,?,?,1,?)",
        ("Test Studio", EMAIL, "x", iso(NOW)),
    ).lastrowid
    c.execute(
        "INSERT INTO connections (user_id, encrypted_key, status, created_at) VALUES (?,?,?,?)",
        (uid, encrypt_secret("rk_test"), "active", iso(NOW)),
    )

    def mkinv(sid, **kw):
        d = {"customer_email": "ap@acme.test", "due_date": iso(NOW - timedelta(days=10)),
             "status": "open", "reminder_step": 0, "last_reminder_at": None}
        d.update(kw)
        c.execute(
            "INSERT INTO tracked_invoices (user_id, stripe_invoice_id, customer_name, customer_email, amount_due, "
            "currency, due_date, hosted_invoice_url, status, reminder_step, last_reminder_at, created_at, updated_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
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
        return c.execute("SELECT reminder_step FROM tracked_invoices WHERE user_id=? AND stripe_invoice_id=?", (uid, sid)).fetchone()["reminder_step"]
    assert step("a_due") == 1, step("a_due")
    assert step("c_step2") == 2, step("c_step2")
    assert step("b_gap") == 1, "b_gap unchanged"
    assert step("g_maxed") == 3, "g_maxed unchanged"
    n = c.execute("SELECT COUNT(*) AS n FROM reminders_sent WHERE user_id=?", (uid,)).fetchone()["n"]
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
        "FROM tracked_invoices WHERE user_id=? AND stripe_invoice_id='regress_field'", (uid,),
    ).fetchone()
assert r is not None, "upsert_invoice must insert the synced row"
assert r["amount_due"] == 12345 and r["currency"] == "eur", dict(r)
assert r["customer_email"] == "r@acme.test", dict(r)
assert r["due_date"].startswith(_due.date().isoformat()), r["due_date"]
print("stripe field access (v15 regression): PASS")

with get_conn() as c:
    c.execute("DELETE FROM users WHERE id = ?", (uid,))  # cascade cleans connection/invoices/reminders
print("\nALL COLLECTIONS TESTS PASSED")

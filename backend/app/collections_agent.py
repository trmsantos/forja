"""Collections Agent — the autonomous reminder engine (Week 2 core).

Daily sweep: for each active connection, re-sync invoices from Stripe (so paid ones drop
out of scope), then send escalating reminders for overdue OPEN invoices, logging each to
reminders_sent and advancing reminder_step. It stops at MAX_STEPS and never sends two
reminders within MIN_GAP_DAYS — so it keeps working while the owner is away, without spamming.

Safety:
  - The scheduler only starts when COLLECTIONS_ENABLED=1 (see main.py).
  - COLLECTIONS_DRY_RUN=1 logs the reminders it *would* send instead of emailing real
    debtors. Use it until you trust the data and copy.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from .db import get_conn
from .email import reminder_html, reminder_subject, send_email
from .security import decrypt_secret
from .stripe_sync import sync_invoices

MAX_STEPS = int(os.getenv("COLLECTIONS_MAX_STEPS", "3"))
MIN_GAP_DAYS = int(os.getenv("COLLECTIONS_MIN_GAP_DAYS", "7"))


def _parse(dt_iso: Optional[str]) -> Optional[datetime]:
    return datetime.fromisoformat(dt_iso) if dt_iso else None


def next_reminder_step(invoice: dict, now: datetime) -> Optional[int]:
    """Pure decision: which reminder step to send for this invoice right now, or None to skip.

    Rules: only OPEN invoices with a due date that is at least 1 day past; at most MAX_STEPS
    reminders; and at least MIN_GAP_DAYS between reminders. Kept side-effect-free so it can be
    unit-tested without a database or Stripe."""
    if invoice.get("status") != "open":
        return None
    due = _parse(invoice.get("due_date"))
    if due is None:
        return None  # can't chase an invoice with no due date
    if (now - due).days < 1:
        return None  # not overdue yet
    step = invoice.get("reminder_step") or 0
    if step >= MAX_STEPS:
        return None  # exhausted — left for the owner to escalate
    last = _parse(invoice.get("last_reminder_at"))
    if last is not None and (now - last).days < MIN_GAP_DAYS:
        return None  # too soon since the last reminder
    return step + 1


def _amount_display(amount: Optional[int], currency: Optional[str]) -> str:
    if amount is None:
        return "the outstanding amount"
    return f"{amount / 100:.2f} {(currency or 'eur').upper()}"


def send_reminder(conn, user_row, inv_row, step: int, now: datetime, dry_run: bool) -> bool:
    """Send (or, in dry-run, log) one reminder and record it. Returns True if it counted."""
    debtor_email = inv_row["customer_email"]
    if not debtor_email:
        return False  # nothing to send to

    due = _parse(inv_row["due_date"])
    days_overdue = (now - due).days if due else 0
    amount = _amount_display(inv_row["amount_due"], inv_row["currency"])
    studio = user_row["name"]
    subject = reminder_subject(step, studio, days_overdue)

    if dry_run:
        print(f"[collections:dry-run] user={user_row['id']} step={step} → {debtor_email}"
              f" · {amount} · {days_overdue}d overdue · '{subject}'")
        sent = True
    else:
        html = reminder_html(
            step, studio, inv_row["customer_name"] or "there", amount, days_overdue,
            inv_row["hosted_invoice_url"],
        )
        # Reply-To the actual vendor so debtor replies reach them, not Forja.
        sent = send_email(debtor_email, subject, html, reply_to=user_row["email"])

    if sent:
        iso = now.isoformat()
        conn.execute(
            "INSERT INTO reminders_sent (invoice_id, user_id, step, channel, to_email, subject, sent_at) "
            "VALUES (?, ?, ?, 'email', ?, ?, ?)",
            (inv_row["id"], user_row["id"], step, debtor_email, subject, iso),
        )
        conn.execute(
            "UPDATE tracked_invoices SET reminder_step = ?, last_reminder_at = ?, updated_at = ? WHERE id = ?",
            (step, iso, iso, inv_row["id"]),
        )
    return sent


def run_sweep(user_id: Optional[int] = None, dry_run: Optional[bool] = None) -> dict:
    """Sweep active connections: re-sync invoices, then send any due reminders.

    user_id: limit to one user (the manual /api/collections/run trigger uses this).
    dry_run: override; defaults to the COLLECTIONS_DRY_RUN env flag.
    Returns a summary dict for logging / the API response."""
    if dry_run is None:
        # Safe default: dry-run unless explicitly turned live with COLLECTIONS_DRY_RUN=0.
        dry_run = os.getenv("COLLECTIONS_DRY_RUN", "1") == "1"
    now = datetime.now(timezone.utc)

    with get_conn() as conn:
        query = "SELECT user_id, encrypted_key FROM connections WHERE status = 'active'"
        params: tuple = ()
        if user_id is not None:
            query += " AND user_id = ?"
            params = (user_id,)
        conns = [(r["user_id"], r["encrypted_key"]) for r in conn.execute(query, params).fetchall()]

    summary = {"connections": len(conns), "synced": 0, "reminders": 0, "errors": 0, "dry_run": dry_run}

    for uid, encrypted_key in conns:
        try:
            key = decrypt_secret(encrypted_key)
        except Exception:
            summary["errors"] += 1
            continue
        # 1) refresh from Stripe so paid invoices are no longer 'open' (don't chase the paid)
        try:
            summary["synced"] += sync_invoices(uid, key).get("synced", 0)
        except Exception as exc:
            print("[collections] sync failed for user", uid, "-", exc)
            summary["errors"] += 1
            continue  # skip sending on stale data
        # 2) decide + send for this user's still-open invoices
        with get_conn() as conn:
            user_row = conn.execute("SELECT id, name, email FROM users WHERE id = ?", (uid,)).fetchone()
            if user_row is None:
                continue
            invoices = conn.execute(
                "SELECT * FROM tracked_invoices WHERE user_id = ? AND status = 'open'", (uid,)
            ).fetchall()
            for inv in invoices:
                step = next_reminder_step(dict(inv), now)
                if step is not None and send_reminder(conn, user_row, inv, step, now, dry_run):
                    summary["reminders"] += 1

    print(f"[collections] sweep done: {summary}")
    return summary

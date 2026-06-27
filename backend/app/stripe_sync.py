"""Pull a customer's overdue invoices from Stripe into tracked_invoices.

Shared by the connect endpoint (first sync) and the Collections Agent (scheduled re-sync),
so the upsert + paid/void reconciliation logic lives in exactly one place."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone

from .db import get_conn


def _field(obj, key, default=None):
    """Safe field read for Stripe objects. stripe-python v15's StripeObject dropped
    dict-style .get(), so subscript with a KeyError fallback is the portable accessor
    (works on v11+ too)."""
    try:
        return obj[key]
    except KeyError:
        return default


def upsert_invoice(conn: sqlite3.Connection, user_id: int, inv, now: str) -> None:
    """Insert or refresh one tracked invoice. Idempotent on (user_id, stripe id)."""
    due = _field(inv, "due_date")
    due_iso = datetime.fromtimestamp(due, tz=timezone.utc).isoformat() if due else None
    conn.execute(
        """
        INSERT INTO tracked_invoices
            (user_id, stripe_invoice_id, customer_name, customer_email, amount_due,
             currency, due_date, hosted_invoice_url, status, reminder_step, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', 0, ?, ?)
        ON CONFLICT(user_id, stripe_invoice_id) DO UPDATE SET
            customer_name = excluded.customer_name,
            customer_email = excluded.customer_email,
            amount_due = excluded.amount_due,
            currency = excluded.currency,
            due_date = excluded.due_date,
            hosted_invoice_url = excluded.hosted_invoice_url,
            status = 'open',
            updated_at = excluded.updated_at
        """,
        (
            user_id, inv["id"], _field(inv, "customer_name"), _field(inv, "customer_email"),
            _field(inv, "amount_due"), _field(inv, "currency"), due_iso,
            _field(inv, "hosted_invoice_url"), now, now,
        ),
    )


def sync_invoices(user_id: int, api_key: str) -> dict:
    """Pull the customer's open invoices into tracked_invoices and reconcile any that
    are no longer open (paid/void) so the dashboard's recovered total stays accurate.
    Network reads happen outside the DB write so we don't hold a write lock on Stripe I/O."""
    import stripe

    stripe.api_key = api_key
    now = datetime.now(timezone.utc).isoformat()

    fetched = list(stripe.Invoice.list(status="open", limit=100).auto_paging_iter())
    open_ids = {inv["id"] for inv in fetched}

    with get_conn() as conn:
        for inv in fetched:
            upsert_invoice(conn, user_id, inv, now)
        previously_open = conn.execute(
            "SELECT id, stripe_invoice_id FROM tracked_invoices WHERE user_id = ? AND status = 'open'",
            (user_id,),
        ).fetchall()
        conn.execute("UPDATE connections SET last_synced_at = ? WHERE user_id = ?", (now, user_id))

    stale = [r for r in previously_open if r["stripe_invoice_id"] not in open_ids]
    for r in stale:
        try:
            inv = stripe.Invoice.retrieve(r["stripe_invoice_id"])
            with get_conn() as conn:
                conn.execute(
                    "UPDATE tracked_invoices SET status = ?, updated_at = ? WHERE id = ?",
                    (_field(inv, "status"), now, r["id"]),
                )
        except Exception:
            pass  # transient Stripe error; next sweep retries

    return {"synced": len(fetched), "reconciled": len(stale)}

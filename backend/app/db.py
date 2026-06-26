"""SQLite storage. Standard-library only — no ORM, no extra dependency.
Swap for Postgres (Supabase) when you outgrow a single file."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "forja.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")  # enforce the ON DELETE CASCADE links below
    return conn


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, decl: str) -> None:
    cols = [r["name"] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                email_verified INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                company TEXT,
                service TEXT,
                message TEXT NOT NULL,
                at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                description TEXT,
                amount INTEGER,
                currency TEXT,
                status TEXT NOT NULL,
                stripe_id TEXT UNIQUE,
                at TEXT NOT NULL
            )
            """
        )

        # ---------- AR-collections pivot ----------
        # One Stripe connection per Forja customer: their read-only restricted key,
        # encrypted before it ever reaches here (see security.py). The Collections Agent
        # uses it to read the customer's overdue invoices.
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS connections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                stripe_account_id TEXT,
                encrypted_key TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',  -- active | revoked | error
                last_synced_at TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        # Overdue invoices pulled from the customer's Stripe — the work queue the cron
        # engine chases. Upserted on (user_id, stripe_invoice_id) so a re-sync is idempotent.
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tracked_invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                stripe_invoice_id TEXT NOT NULL,
                customer_name TEXT,
                customer_email TEXT,            -- the debtor we remind
                amount_due INTEGER,             -- cents
                currency TEXT,
                due_date TEXT,                  -- ISO 8601
                hosted_invoice_url TEXT,        -- Stripe-hosted pay link included in reminders
                status TEXT NOT NULL DEFAULT 'open',  -- open | paid | void | uncollectible
                reminder_step INTEGER NOT NULL DEFAULT 0,  -- which escalation step we've reached
                last_reminder_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, stripe_invoice_id)
            )
            """
        )
        # Audit log of every reminder sent — powers the "recovered cash / reminders sent"
        # dashboard, prevents double-sends, and is the paper trail for collection comms.
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS reminders_sent (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id INTEGER NOT NULL REFERENCES tracked_invoices(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                step INTEGER NOT NULL,
                channel TEXT NOT NULL DEFAULT 'email',
                to_email TEXT,
                subject TEXT,
                sent_at TEXT NOT NULL
            )
            """
        )

        # Indexes for the two hot paths: the dashboard (per-user) and the cron sweep
        # ("find open invoices that are due").
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tracked_user_status ON tracked_invoices(user_id, status)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tracked_status_due ON tracked_invoices(status, due_date)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_reminders_invoice ON reminders_sent(invoice_id)")

        # ---------- migrations ----------
        # For databases created before email verification existed.
        _ensure_column(conn, "users", "email_verified", "INTEGER NOT NULL DEFAULT 0")
        # Subscription state for the customer's own recurring billing (Stripe Billing, €49/mo).
        _ensure_column(conn, "users", "stripe_customer_id", "TEXT")
        _ensure_column(conn, "users", "subscription_status", "TEXT NOT NULL DEFAULT 'none'")  # none|trialing|active|past_due|canceled
        _ensure_column(conn, "users", "trial_ends_at", "TEXT")

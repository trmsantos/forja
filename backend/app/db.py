"""Postgres storage (Neon) via psycopg 3.

Connect through the DATABASE_URL env var. In production use Neon's POOLED connection string —
the serverless API opens many short-lived connections. get_conn() returns a psycopg connection
usable as `with get_conn() as conn:`; psycopg commits on a clean exit and rolls back on an
exception (then closes the connection). Rows come back as dicts (dict_row) so row["col"] access
keeps working everywhere it did under sqlite3.Row.
"""

import os

import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.getenv("DATABASE_URL")


def get_conn() -> psycopg.Connection:
    """A new Postgres connection. Use as `with get_conn() as conn: conn.execute(...)`.

    On block exit psycopg commits (or rolls back on error) and closes the connection."""
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set (use the Neon pooled connection string).")
    # prepare_threshold=None disables server-side prepared statements, which break under Neon's
    # pooled endpoint (PgBouncer in transaction pooling mode).
    return psycopg.connect(DATABASE_URL, row_factory=dict_row, prepare_threshold=None)


def init_db() -> None:
    """Create every table + index. Idempotent (CREATE TABLE IF NOT EXISTS). The prod DB is fresh,
    so all columns are defined here directly — no incremental ALTER-TABLE migrations.

    Foreign-key columns are BIGINT to match the BIGSERIAL (int8) primary keys they reference."""
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                email_verified INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                stripe_customer_id TEXT,
                subscription_status TEXT NOT NULL DEFAULT 'none',  -- none|trialing|active|past_due|canceled
                trial_ends_at TEXT,
                display_name TEXT,  -- optional preferred name shown in the UI (falls back to name)
                avatar_url TEXT,    -- profile photo, stored on Vercel Blob
                business_name TEXT, -- studio/sender name shown to debtors in reminders (falls back to name)
                reminder_tone TEXT, -- 'friendly' | 'firm' (app default 'friendly')
                reminder_gap_days INTEGER  -- days between reminders (app default = COLLECTIONS_MIN_GAP_DAYS)
            )
            """
        )
        # Lightweight migration for the already-provisioned prod DB: CREATE TABLE IF NOT EXISTS
        # above never adds columns to an existing table, so add newer columns idempotently.
        conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT")
        conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT")
        conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name TEXT")
        conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_tone TEXT")
        conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_gap_days INTEGER")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS leads (
                id BIGSERIAL PRIMARY KEY,
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
                id BIGSERIAL PRIMARY KEY,
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

        # ---------- AR-collections ----------
        # One Stripe connection per Forja customer: their read-only restricted key, encrypted
        # before it ever reaches here (see security.py).
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS connections (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                stripe_account_id TEXT,
                encrypted_key TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',  -- active | revoked | error
                last_synced_at TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        # Overdue invoices pulled from the customer's Stripe — the work queue the cron engine
        # chases. Upserted on (user_id, stripe_invoice_id) so a re-sync is idempotent.
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tracked_invoices (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
                UNIQUE (user_id, stripe_invoice_id)
            )
            """
        )
        # Audit log of every reminder sent — powers the dashboard totals, prevents double-sends,
        # and is the paper trail for collection comms.
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS reminders_sent (
                id BIGSERIAL PRIMARY KEY,
                invoice_id BIGINT NOT NULL REFERENCES tracked_invoices(id) ON DELETE CASCADE,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                step INTEGER NOT NULL,
                channel TEXT NOT NULL DEFAULT 'email',
                to_email TEXT,
                subject TEXT,
                sent_at TEXT NOT NULL
            )
            """
        )

        # Indexes for the two hot paths: the dashboard (per-user) and the cron sweep.
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tracked_user_status ON tracked_invoices(user_id, status)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tracked_status_due ON tracked_invoices(status, due_date)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_reminders_invoice ON reminders_sent(invoice_id)")

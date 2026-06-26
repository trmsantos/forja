"""SQLite storage. Standard-library only — no ORM, no extra dependency.
Swap for Postgres (Supabase) when you outgrow a single file."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "forja.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
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
        # Migration for databases created before email verification existed.
        _ensure_column(conn, "users", "email_verified", "INTEGER NOT NULL DEFAULT 0")

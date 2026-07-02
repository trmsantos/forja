"""Forja backend — FastAPI.

Endpoints:
  POST /api/auth/register             create account (sends a verification email), returns JWT + user
  POST /api/auth/login                log in, returns JWT + user
  GET  /api/auth/me                   current user (Bearer token)
  POST /api/auth/verify               confirm email from the link token
  POST /api/auth/resend-verification  resend the confirmation email (Bearer token)
  GET  /api/account/requests          the logged-in user's submitted requests
  POST /api/leads                     capture a request (notifies studio + auto-replies to sender)
  POST /api/checkout                  Stripe Checkout session for a buyable package
  GET  /api/health

Email sends through Resend if RESEND_API_KEY is set, otherwise prints to console (dev).
Stripe is optional: without STRIPE_SECRET_KEY, /api/checkout returns a friendly message.
"""

from __future__ import annotations

import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv

# Load .env BEFORE importing app modules — .email and .security read env vars at
# import time (RESEND_API_KEY, JWT_SECRET, ENCRYPTION_KEY), so loading after those
# imports would leave them snapshotting unset values / defaults.
load_dotenv()

import psycopg
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field

from .blob import blob_configured, delete_blob, put_blob
from .db import get_conn, init_db
from .stripe_sync import audit_summary, sync_invoices
from .email import (
    STUDIO_EMAIL,
    lead_confirmation_html,
    lead_notification_html,
    receipt_html,
    send_email,
    verification_html,
)
from .security import (
    create_email_token,
    create_token,
    decode_email_token,
    decode_token,
    encrypt_secret,
    hash_password,
    verify_password,
)

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:4000")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
PACKAGE_PRICES = {
    "audit": os.getenv("STRIPE_PRICE_AUDIT", ""),
    "automation-starter": os.getenv("STRIPE_PRICE_AUTOMATION", ""),
}

# Recurring subscription plans — the actual revenue model. Each maps to a Stripe Price id
# created on Forja's OWN account. Without these set, /api/billing/subscribe returns a friendly
# "not configured yet" message instead of failing — same pattern as one-off checkout.
SUBSCRIPTION_PRICES = {
    "solo": os.getenv("STRIPE_PRICE_SOLO", ""),
    "studio": os.getenv("STRIPE_PRICE_STUDIO", ""),
    "agency": os.getenv("STRIPE_PRICE_AGENCY", ""),
}
TRIAL_DAYS = int(os.getenv("TRIAL_DAYS", "14"))
# A plan in one of these states may use the collections engine; everything else is paywalled.
ACTIVE_PLAN_STATUSES = {"active", "trialing"}

# Vercel Cron auth: the scheduled GET /api/cron/daily must carry "Authorization: Bearer $CRON_SECRET".
CRON_SECRET = os.getenv("CRON_SECRET")

# The single owner account allowed to see product analytics (/api/admin/*). Defaults to the
# founder's personal email; override with ADMIN_EMAIL in the environment.
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "trmsantos22102002@gmail.com").strip().lower()

app = FastAPI(title="Forja API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:4000", "http://127.0.0.1:4000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer = HTTPBearer(auto_error=True)


_db_initialized = False


@app.on_event("startup")
def _startup() -> None:
    """Create tables on the first cold start, guarded so it runs once per process and never
    crashes the app: a serverless function must still boot if DATABASE_URL is briefly unset or
    the DB is unreachable (canonical creation is `python backend/scripts/init_db.py`).

    There is no in-process scheduler on serverless — the daily sweep and weekly recap run via
    Vercel Cron hitting /api/cron/daily."""
    global _db_initialized
    if _db_initialized:
        return
    try:
        init_db()
        _db_initialized = True
    except Exception as exc:
        print("[startup] init_db skipped:", exc)


# ---------- models ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class VerifyIn(BaseModel):
    token: str


class Lead(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    company: Optional[str] = Field(default=None, max_length=160)
    service: Optional[str] = Field(default=None, max_length=160)
    message: str = Field(min_length=1, max_length=4000)


class CheckoutRequest(BaseModel):
    package_id: str


class SubscribeIn(BaseModel):
    # Which recurring plan to start. Defaults to the featured "studio" tier.
    plan: str = Field(default="studio")


class ConnectStripeIn(BaseModel):
    # A Stripe restricted key (rk_…) with read access to Invoices.
    api_key: str = Field(min_length=12, max_length=200)


class AuditIn(BaseModel):
    # Public lead-magnet: a read-only Stripe key, plus an optional email to capture as a lead.
    api_key: str = Field(min_length=12, max_length=200)
    email: Optional[EmailStr] = None


class ProfileIn(BaseModel):
    # Full name (used on receipts/comms) plus an optional preferred name for the greeting.
    name: str = Field(min_length=1, max_length=120)
    display_name: Optional[str] = Field(default=None, max_length=60)


class PasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=8, max_length=200)


class ReminderSettingsIn(BaseModel):
    # What debtors see and how often. business_name falls back to the account name when blank.
    business_name: Optional[str] = Field(default=None, max_length=80)
    tone: str = Field(default="friendly")  # friendly | firm (validated in the handler)
    gap_days: int = Field(default=7, ge=1, le=30)


# ---------- helpers ----------
def _user_dict(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "email_verified": bool(row["email_verified"]),
        "display_name": row.get("display_name"),
        "avatar_url": row.get("avatar_url"),
        "is_admin": (row["email"] or "").strip().lower() == ADMIN_EMAIL,
    }


def _require_admin(user: dict) -> None:
    """Gate the analytics endpoints to the single owner account (defense in depth alongside the
    UI hiding the link)."""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admins only.")


def _send_verification(user_id: int, name: str, email: str) -> None:
    token = create_email_token(user_id, "verify")
    link = f"{FRONTEND_ORIGIN}/verify?token={token}"
    send_email(email, "Confirm your Forja account", verification_html(name, link))


def _sub_state(
    status: Optional[str], trial_ends_at: Optional[str], stripe_customer_id: Optional[str]
) -> "tuple[str, Optional[int]]":
    """Effective (status, trial_days_left) for gating + display.

    The trial is self-managed: it auto-starts when Stripe is connected (no Stripe customer yet)
    and expires by trial_ends_at. Once past, it reads as 'canceled' even though the stored row
    still says 'trialing' until the daily cron rewrites it. Stripe-managed subscriptions carry a
    stripe_customer_id and are governed by webhooks, so we trust their stored status."""
    status = status or "none"
    if status != "trialing":
        return status, None
    now = datetime.now(timezone.utc)
    ends: Optional[datetime] = None
    if trial_ends_at:
        try:
            ends = datetime.fromisoformat(trial_ends_at)
        except ValueError:
            ends = None
    if not stripe_customer_id and (ends is None or ends <= now):
        return "canceled", None  # self-managed trial lapsed
    days_left = max(0, (ends - now).days) if ends and ends > now else None
    return "trialing", days_left


def _plan_is_active(user_id: int) -> bool:
    """True if the user may use the collections engine (paid, or in an unexpired trial).
    This is the paywall: chasing is gated on it."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT subscription_status, trial_ends_at, stripe_customer_id FROM users WHERE id = %s",
            (user_id,),
        ).fetchone()
    if not row:
        return False
    status, _ = _sub_state(row["subscription_status"], row["trial_ends_at"], row["stripe_customer_id"])
    return status in ACTIVE_PLAN_STATUSES


def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    try:
        user_id = decode_token(creds.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name, email, email_verified, display_name, avatar_url FROM users WHERE id = %s",
            (user_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="User not found")
    return _user_dict(row)


# ---------- routes ----------
@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/auth/register")
def register(body: RegisterIn) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    try:
        with get_conn() as conn:
            row = conn.execute(
                "INSERT INTO users (name, email, password_hash, email_verified, created_at) "
                "VALUES (%s, %s, %s, 0, %s) RETURNING id",
                (body.name, body.email.lower(), hash_password(body.password), now),
            ).fetchone()
            user_id = row["id"]
    except psycopg.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    _send_verification(user_id, body.name, body.email.lower())
    return {
        "token": create_token(user_id),
        "user": {
            "id": user_id,
            "name": body.name,
            "email": body.email.lower(),
            "email_verified": False,
            "display_name": None,
            "avatar_url": None,
            "is_admin": body.email.strip().lower() == ADMIN_EMAIL,
        },
    }


@app.post("/api/auth/login")
def login(body: LoginIn) -> dict:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name, email, email_verified, password_hash, display_name, avatar_url "
            "FROM users WHERE email = %s",
            (body.email.lower(),),
        ).fetchone()
    if row is None or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    return {"token": create_token(row["id"]), "user": _user_dict(row)}


@app.get("/api/auth/me")
def me(user: dict = Depends(current_user)) -> dict:
    return user


@app.post("/api/auth/verify")
def verify_email(body: VerifyIn) -> dict:
    try:
        user_id = decode_email_token(body.token, "verify")
    except Exception:
        raise HTTPException(status_code=400, detail="This confirmation link is invalid or has expired")
    with get_conn() as conn:
        conn.execute("UPDATE users SET email_verified = 1 WHERE id = %s", (user_id,))
        row = conn.execute(
            "SELECT id, name, email, email_verified, display_name, avatar_url FROM users WHERE id = %s",
            (user_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True, "user": _user_dict(row)}


@app.post("/api/auth/resend-verification")
def resend_verification(user: dict = Depends(current_user)) -> dict:
    if user["email_verified"]:
        return {"ok": True, "already_verified": True}
    _send_verification(user["id"], user["name"], user["email"])
    return {"ok": True}


# ---------- profile & account settings ----------
# Accepted avatar types -> file extension. Kept small on purpose (raster photos only).
ALLOWED_AVATAR_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
}
MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB


@app.post("/api/account/profile")
def update_profile(body: ProfileIn, user: dict = Depends(current_user)) -> dict:
    """Update the display name (and full name). Returns the refreshed user object."""
    name = body.name.strip()
    display = (body.display_name or "").strip() or None
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET name = %s, display_name = %s WHERE id = %s",
            (name, display, user["id"]),
        )
        row = conn.execute(
            "SELECT id, name, email, email_verified, display_name, avatar_url FROM users WHERE id = %s",
            (user["id"],),
        ).fetchone()
    return _user_dict(row)


@app.post("/api/account/password")
def change_password(body: PasswordIn, user: dict = Depends(current_user)) -> dict:
    """Change the password after re-verifying the current one."""
    with get_conn() as conn:
        row = conn.execute("SELECT password_hash FROM users WHERE id = %s", (user["id"],)).fetchone()
        if row is None or not verify_password(body.current_password, row["password_hash"]):
            raise HTTPException(status_code=400, detail="Your current password is incorrect.")
        conn.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (hash_password(body.new_password), user["id"]),
        )
    return {"ok": True}


@app.post("/api/account/avatar")
async def upload_avatar(request: Request, user: dict = Depends(current_user)) -> dict:
    """Store a profile photo on Vercel Blob. The image is sent as the raw request body with the
    image type as Content-Type — we read request.body() directly to avoid pulling python-multipart
    into the serverless bundle."""
    if not blob_configured():
        raise HTTPException(
            status_code=503,
            detail="Photo uploads aren't switched on yet. Connect a Vercel Blob store to enable them.",
        )
    content_type = (request.headers.get("content-type") or "").split(";")[0].strip().lower()
    ext = ALLOWED_AVATAR_TYPES.get(content_type)
    if not ext:
        raise HTTPException(status_code=400, detail="Please upload a PNG, JPG, WEBP, or GIF image.")

    data = await request.body()
    if not data:
        raise HTTPException(status_code=400, detail="No image received.")
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="That image is too large (2 MB max).")

    try:
        url = put_blob(f"avatars/user-{user['id']}.{ext}", data, content_type)
    except Exception as exc:  # noqa: BLE001 - surface a clean error, log the cause
        print("[avatar] upload failed:", exc)
        raise HTTPException(status_code=502, detail="Could not store the image. Please try again.")

    with get_conn() as conn:
        prev = conn.execute("SELECT avatar_url FROM users WHERE id = %s", (user["id"],)).fetchone()
        conn.execute("UPDATE users SET avatar_url = %s WHERE id = %s", (url, user["id"]))
    if prev and prev["avatar_url"]:
        delete_blob(prev["avatar_url"])  # best-effort cleanup of the replaced photo
    return {"avatar_url": url}


@app.delete("/api/account/avatar")
def remove_avatar(user: dict = Depends(current_user)) -> dict:
    with get_conn() as conn:
        prev = conn.execute("SELECT avatar_url FROM users WHERE id = %s", (user["id"],)).fetchone()
        conn.execute("UPDATE users SET avatar_url = NULL WHERE id = %s", (user["id"],))
    if prev and prev["avatar_url"]:
        delete_blob(prev["avatar_url"])
    return {"ok": True}


@app.post("/api/connect/disconnect")
def disconnect_stripe(user: dict = Depends(current_user)) -> dict:
    """Revoke the Stripe connection. The daily sweep only touches active connections, so this
    stops all chasing immediately; synced invoices stay for the record until re-connected."""
    with get_conn() as conn:
        conn.execute(
            "UPDATE connections SET status = 'revoked' WHERE user_id = %s", (user["id"],)
        )
    return {"ok": True}


# ---------- reminder settings & preview ----------
REMINDER_TONES = {"friendly", "firm"}
_DEFAULT_GAP_DAYS = int(os.getenv("COLLECTIONS_MIN_GAP_DAYS", "7"))


def _reminder_settings(row: dict) -> dict:
    """Resolve effective reminder settings, applying fallbacks (business name -> preferred ->
    legal name; tone -> friendly; gap -> the engine default)."""
    return {
        "business_name": (row.get("business_name") or row.get("display_name") or row["name"]),
        "tone": row.get("reminder_tone") or "friendly",
        "gap_days": row.get("reminder_gap_days") or _DEFAULT_GAP_DAYS,
    }


_REMINDER_COLS = "name, display_name, business_name, reminder_tone, reminder_gap_days"


@app.get("/api/reminders/settings")
def get_reminder_settings(user: dict = Depends(current_user)) -> dict:
    with get_conn() as conn:
        row = conn.execute(f"SELECT {_REMINDER_COLS} FROM users WHERE id = %s", (user["id"],)).fetchone()
    return _reminder_settings(row)


@app.post("/api/reminders/settings")
def update_reminder_settings(body: ReminderSettingsIn, user: dict = Depends(current_user)) -> dict:
    tone = body.tone if body.tone in REMINDER_TONES else "friendly"
    business = (body.business_name or "").strip() or None
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET business_name = %s, reminder_tone = %s, reminder_gap_days = %s WHERE id = %s",
            (business, tone, body.gap_days, user["id"]),
        )
        row = conn.execute(f"SELECT {_REMINDER_COLS} FROM users WHERE id = %s", (user["id"],)).fetchone()
    return _reminder_settings(row)


@app.get("/api/reminders/preview")
def preview_reminders(user: dict = Depends(current_user)) -> dict:
    """Render the exact gentle -> firm -> final emails a debtor would receive, using the user's
    current settings and sample invoice data. Nothing is sent — this is a read-only preview."""
    from .email import reminder_html, reminder_subject

    with get_conn() as conn:
        row = conn.execute(f"SELECT {_REMINDER_COLS} FROM users WHERE id = %s", (user["id"],)).fetchone()
    s = _reminder_settings(row)
    studio, tone, gap = s["business_name"], s["tone"], s["gap_days"]

    sample_name, sample_amount = "Sample Client", "1,200.00 EUR"
    sample_pay_url = "https://invoice.stripe.com/i/preview"
    steps = [
        {
            "step": step,
            "subject": reminder_subject(step, studio, 3 + i * gap),
            "html": reminder_html(step, studio, sample_name, sample_amount, 3 + i * gap, sample_pay_url, tone=tone),
        }
        for i, step in enumerate((1, 2, 3))
    ]
    return {**s, "steps": steps}


@app.get("/api/account/requests")
def account_requests(user: dict = Depends(current_user)) -> list:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT service, message, at FROM leads WHERE email = %s ORDER BY at DESC",
            (user["email"],),
        ).fetchall()
    return [{"service": r["service"], "message": r["message"], "at": r["at"]} for r in rows]


@app.post("/api/leads")
def create_lead(lead: Lead) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO leads (name, email, company, service, message, at) VALUES (%s, %s, %s, %s, %s, %s)",
            (lead.name, lead.email.lower(), lead.company, lead.service, lead.message, now),
        )
    send_email(
        STUDIO_EMAIL,
        f"New enquiry: {lead.service or 'general'} — {lead.name}",
        lead_notification_html(lead.name, lead.email, lead.company or "", lead.service or "", lead.message),
    )
    send_email(lead.email, "We got your message — Forja", lead_confirmation_html(lead.name))
    return {"ok": True}


@app.post("/api/audit")
def audit(body: AuditIn) -> dict:
    """Public lead magnet (no signup): read a visitor's Stripe invoices and return a one-time
    overdue summary. STATELESS by design — the key and invoices are read in memory and never
    persisted. Only an optional email is captured, as a lead (same table as /api/leads)."""
    import stripe

    key = body.api_key.strip()
    stripe.api_key = key
    try:
        stripe.Invoice.list(limit=1)  # validate the key reads invoices (same check as /api/connect/stripe)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="That key didn't work. Use a Stripe restricted key (rk_…) with read access to Invoices.",
        )

    summary = audit_summary(key)  # read-only, in-memory; nothing is stored

    # Optional lead capture — best-effort, never blocks or fails the preview.
    if body.email:
        try:
            now = datetime.now(timezone.utc).isoformat()
            note = (
                f"Free audit: {summary['overdue_count']} overdue of {summary['outstanding_count']} open invoices · "
                f"{(summary['overdue_amount'] or 0) / 100:.2f} {summary['currency'].upper()} overdue."
            )
            with get_conn() as conn:
                conn.execute(
                    "INSERT INTO leads (name, email, company, service, message, at) VALUES (%s, %s, %s, %s, %s, %s)",
                    ("Audit lead", body.email.lower(), None, "audit", note, now),
                )
            send_email(
                STUDIO_EMAIL,
                f"New audit lead: {body.email.lower()}",
                lead_notification_html("Audit lead", body.email, "", "Free overdue-invoice audit", note),
            )
        except Exception as exc:
            print("[audit] lead capture failed:", exc)

    return summary


@app.post("/api/checkout")
def checkout(req: CheckoutRequest) -> dict:
    price_id = PACKAGE_PRICES.get(req.package_id)
    if not STRIPE_SECRET_KEY or not price_id:
        return {
            "message": (
                "Online checkout isn't configured yet. Add STRIPE_SECRET_KEY and the package "
                "price IDs to .env — until then, use 'Start a project' to reach us."
            )
        }

    import stripe

    stripe.api_key = STRIPE_SECRET_KEY
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{FRONTEND_ORIGIN}/?checkout=success",
        cancel_url=f"{FRONTEND_ORIGIN}/?checkout=cancelled#pricing",
    )
    return {"url": session.url}


@app.get("/api/account/payments")
def account_payments(user: dict = Depends(current_user)) -> list:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT description, amount, currency, status, at FROM payments WHERE email = %s ORDER BY at DESC",
            (user["email"],),
        ).fetchall()
    return [
        {"description": r["description"], "amount": r["amount"], "currency": r["currency"], "status": r["status"], "at": r["at"]}
        for r in rows
    ]


# ---------- AR collections: connect Stripe, dashboard, billing ----------
@app.post("/api/connect/stripe")
def connect_stripe(body: ConnectStripeIn, user: dict = Depends(current_user)) -> dict:
    """Store the customer's read-only Stripe key (encrypted) and do a first sync."""
    import stripe

    key = body.api_key.strip()
    stripe.api_key = key
    try:
        stripe.Invoice.list(limit=1)  # validate the key can actually read invoices
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="That key didn't work. Use a Stripe restricted key (rk_…) with read access to Invoices.",
        )

    account_id = None
    try:
        account_id = stripe.Account.retrieve().get("id")
    except Exception:
        pass  # restricted key may not expose the account; not required

    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO connections (user_id, stripe_account_id, encrypted_key, status, last_synced_at, created_at)
            VALUES (%s, %s, %s, 'active', %s, %s)
            ON CONFLICT (user_id) DO UPDATE SET
                stripe_account_id = excluded.stripe_account_id,
                encrypted_key = excluded.encrypted_key,
                status = 'active',
                error_reason = NULL,
                last_synced_at = excluded.last_synced_at
            """,
            (user["id"], account_id, encrypt_secret(key), now, now),
        )

    # Defensive: the key already validated above, but don't let a transient sync hiccup 500 the
    # connect — the connection is saved and the daily sweep will sync on its next run.
    try:
        result = sync_invoices(user["id"], key)
    except Exception as exc:
        print("[connect] initial sync failed (connection saved, will retry on sweep):", exc)
        result = {"synced": 0, "reconciled": 0}

    # Activation: the moment Stripe is connected, start a free, self-managed trial so chasing is
    # on immediately — this is what makes "connect once and it runs" literally true. No Stripe and
    # no card are involved; converting to a paid plan happens later via /api/billing/subscribe.
    # Only for users who've never subscribed (status 'none', no Stripe customer) — never override
    # an existing paid/canceled state.
    trial_end = (datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)).isoformat()
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE users SET subscription_status = 'trialing', trial_ends_at = %s "
            "WHERE id = %s AND subscription_status = 'none' AND stripe_customer_id IS NULL",
            (trial_end, user["id"]),
        )
        trial_started = cur.rowcount > 0
    return {
        "ok": True,
        "stripe_account_id": account_id,
        "trial_started": trial_started,
        "trial_days_left": TRIAL_DAYS if trial_started else None,
        **result,
    }


@app.get("/api/dashboard")
def dashboard(user: dict = Depends(current_user)) -> dict:
    """Everything the account view needs: connection state, money totals, invoices."""
    with get_conn() as conn:
        conn_row = conn.execute(
            "SELECT stripe_account_id, status, last_synced_at, error_reason FROM connections WHERE user_id = %s",
            (user["id"],),
        ).fetchone()
        sub_row = conn.execute(
            "SELECT subscription_status, trial_ends_at, stripe_customer_id FROM users WHERE id = %s",
            (user["id"],),
        ).fetchone()
        open_row = conn.execute(
            "SELECT COUNT(*) AS c, COALESCE(SUM(amount_due), 0) AS s "
            "FROM tracked_invoices WHERE user_id = %s AND status = 'open'",
            (user["id"],),
        ).fetchone()
        recovered = conn.execute(
            "SELECT COALESCE(SUM(amount_due), 0) AS s FROM tracked_invoices WHERE user_id = %s AND status = 'paid'",
            (user["id"],),
        ).fetchone()["s"]
        reminders = conn.execute(
            "SELECT COUNT(*) AS c FROM reminders_sent WHERE user_id = %s", (user["id"],)
        ).fetchone()["c"]
        invoices = conn.execute(
            "SELECT stripe_invoice_id, customer_name, customer_email, amount_due, currency, "
            "due_date, hosted_invoice_url, status, reminder_step, last_reminder_at "
            "FROM tracked_invoices WHERE user_id = %s ORDER BY due_date IS NULL, due_date ASC",
            (user["id"],),
        ).fetchall()

    status, trial_days_left = _sub_state(
        sub_row["subscription_status"] if sub_row else "none",
        sub_row["trial_ends_at"] if sub_row else None,
        sub_row["stripe_customer_id"] if sub_row else None,
    )
    return {
        "connected": bool(conn_row) and conn_row["status"] == "active",
        "connection_status": conn_row["status"] if conn_row else None,  # active | error | revoked | None
        "connection_error": conn_row["error_reason"] if conn_row else None,
        "stripe_account_id": conn_row["stripe_account_id"] if conn_row else None,
        "last_synced_at": conn_row["last_synced_at"] if conn_row else None,
        "subscription_status": status,
        "trial_ends_at": sub_row["trial_ends_at"] if sub_row else None,
        "trial_days_left": trial_days_left,
        "totals": {
            "open_count": open_row["c"],
            "outstanding_amount": open_row["s"],
            "recovered_amount": recovered,
            "reminders_sent": reminders,
        },
        "invoices": [dict(r) for r in invoices],
    }


@app.post("/api/billing/subscribe")
def billing_subscribe(body: SubscribeIn, user: dict = Depends(current_user)) -> dict:
    """Convert to a PAID subscription: a Stripe Checkout Session in subscription mode on OUR
    account, with a card collected. The free trial is the self-managed one that starts on Stripe
    connect (see /api/connect/stripe), so this is the paid conversion — no additional trial here.
    The webhook links the resulting customer to this user and flips subscription_status to active.
    Returns a friendly message (not an error) when Stripe isn't configured yet, so the dev/demo
    flow never hard-fails."""
    if body.plan not in SUBSCRIPTION_PRICES:
        raise HTTPException(status_code=400, detail="Unknown plan. Choose solo, studio, or agency.")
    price_id = SUBSCRIPTION_PRICES.get(body.plan)
    # Known plan, but Stripe isn't wired up yet (no secret key or no price id for this plan).
    # Return a friendly message (not an error) so the dev/demo flow never hard-fails.
    if not STRIPE_SECRET_KEY or not price_id:
        return {
            "message": (
                "Subscriptions aren't switched on yet. Add STRIPE_SECRET_KEY and the plan price "
                f"ID for '{body.plan}' (STRIPE_PRICE_{body.plan.upper()}) to backend/.env, then "
                "restart the backend."
            )
        }

    import stripe

    stripe.api_key = STRIPE_SECRET_KEY
    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            customer_email=user["email"],
            client_reference_id=str(user["id"]),  # matches the user on checkout.session.completed
            # Stamp the user id on the subscription too, so later customer.subscription.* events
            # (which don't carry client_reference_id) resolve the user regardless of arrival order.
            subscription_data={"metadata": {"forja_user_id": str(user["id"])}},
            allow_promotion_codes=True,
            success_url=f"{FRONTEND_ORIGIN}/account?subscription=success",
            cancel_url=f"{FRONTEND_ORIGIN}/account?subscription=cancelled",
        )
    except Exception as exc:
        # Surface Stripe's own message (e.g. "No such price", "Invalid API Key", test/live
        # mismatch) instead of an opaque 500, so the cause is visible in the UI and the log.
        detail = getattr(exc, "user_message", None) or str(exc)
        print("[billing] Stripe checkout create failed:", repr(exc))
        raise HTTPException(status_code=400, detail=f"Stripe: {detail}")
    return {"url": session.url}


@app.post("/api/billing/portal")
def billing_portal(user: dict = Depends(current_user)) -> dict:
    """Stripe Customer Portal session on OUR account, so customers self-manage the €49/mo plan."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=400, detail="Billing isn't configured yet.")
    with get_conn() as conn:
        row = conn.execute(
            "SELECT stripe_customer_id FROM users WHERE id = %s", (user["id"],)
        ).fetchone()
    customer_id = row["stripe_customer_id"] if row else None
    if not customer_id:
        raise HTTPException(status_code=400, detail="No subscription is linked to this account yet.")

    import stripe

    stripe.api_key = STRIPE_SECRET_KEY
    session = stripe.billing_portal.Session.create(
        customer=customer_id, return_url=f"{FRONTEND_ORIGIN}/account"
    )
    return {"url": session.url}


@app.post("/api/collections/run")
def collections_run(user: dict = Depends(current_user)) -> dict:
    """Manually trigger a collections sweep for the logged-in user (respects COLLECTIONS_DRY_RUN).
    Paywalled: requires an active or trialing subscription."""
    if not _plan_is_active(user["id"]):
        raise HTTPException(
            status_code=402,
            detail="Connect Stripe to start your free trial, or subscribe to keep automatic chasing on.",
        )
    from .collections_agent import run_sweep

    return run_sweep(user_id=user["id"])


@app.get("/api/admin/metrics")
def admin_metrics(user: dict = Depends(current_user)) -> dict:
    """Owner-only product analytics: the funnel from lead -> signup -> connected -> trial -> paid,
    plus collections output. Gated to ADMIN_EMAIL."""
    _require_admin(user)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    with get_conn() as conn:
        users_total = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
        verified = conn.execute("SELECT COUNT(*) AS c FROM users WHERE email_verified = 1").fetchone()["c"]
        new_7d = conn.execute("SELECT COUNT(*) AS c FROM users WHERE created_at >= %s", (week_ago,)).fetchone()["c"]
        leads_total = conn.execute("SELECT COUNT(*) AS c FROM leads").fetchone()["c"]
        connected = conn.execute("SELECT COUNT(*) AS c FROM connections WHERE status = 'active'").fetchone()["c"]
        errored = conn.execute("SELECT COUNT(*) AS c FROM connections WHERE status = 'error'").fetchone()["c"]
        sub_rows = conn.execute(
            "SELECT subscription_status AS s, COUNT(*) AS c FROM users GROUP BY subscription_status"
        ).fetchall()
        reminders = conn.execute("SELECT COUNT(*) AS c FROM reminders_sent").fetchone()["c"]
        recovered = conn.execute(
            "SELECT COALESCE(SUM(amount_due), 0) AS s FROM tracked_invoices WHERE status = 'paid'"
        ).fetchone()["s"]
        outstanding = conn.execute(
            "SELECT COALESCE(SUM(amount_due), 0) AS s, COUNT(*) AS c FROM tracked_invoices WHERE status = 'open'"
        ).fetchone()
        cur_row = conn.execute(
            "SELECT currency FROM tracked_invoices WHERE currency IS NOT NULL "
            "GROUP BY currency ORDER BY COUNT(*) DESC LIMIT 1"
        ).fetchone()

    subs = {r["s"]: r["c"] for r in sub_rows}
    active = subs.get("active", 0)
    # Everyone who ever started a plan (trial or paid), so conversion excludes never-started users.
    ever_started = active + subs.get("trialing", 0) + subs.get("past_due", 0) + subs.get("canceled", 0)
    conversion = round(100 * active / ever_started, 1) if ever_started else None

    return {
        "users": {"total": users_total, "verified": verified, "new_7d": new_7d},
        "leads": {"total": leads_total},
        "connections": {"connected": connected, "errored": errored},
        "subscriptions": {
            "trialing": subs.get("trialing", 0),
            "active": active,
            "past_due": subs.get("past_due", 0),
            "canceled": subs.get("canceled", 0),
            "none": subs.get("none", 0),
        },
        "conversion": {"trial_to_paid_pct": conversion},
        "collections": {
            "reminders_sent": reminders,
            "recovered_cents": recovered,
            "outstanding_cents": outstanding["s"],
            "open_invoices": outstanding["c"],
            "currency": cur_row["currency"] if cur_row else "eur",
        },
    }


@app.get("/api/cron/daily")
def cron_daily(request: Request) -> dict:
    """Vercel Cron entrypoint (fires once daily). Protected by CRON_SECRET — Vercel sends
    'Authorization: Bearer $CRON_SECRET'. Runs the collections sweep every day, and the weekly
    recap when today's weekday matches RECAP_DAY. One endpoint stays within Hobby's
    once-per-day / cron-count limits. Both respect COLLECTIONS_DRY_RUN."""
    auth = request.headers.get("Authorization", "")
    if not CRON_SECRET or not secrets.compare_digest(auth, f"Bearer {CRON_SECRET}"):
        raise HTTPException(status_code=401, detail="Unauthorized")

    from .collections_agent import run_sweep, run_weekly_recap

    # Expire self-managed trials whose window has passed, so the sweep (which chases any 'trialing'
    # user) doesn't keep working for free. Stripe-managed subscriptions are left to their webhooks.
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET subscription_status = 'canceled' "
            "WHERE subscription_status = 'trialing' AND stripe_customer_id IS NULL "
            "AND trial_ends_at IS NOT NULL AND trial_ends_at < %s",
            (datetime.now(timezone.utc).isoformat(),),
        )

    result: dict = {"swept": run_sweep()}
    today = datetime.now(timezone.utc).strftime("%a").lower()  # mon, tue, ...
    if today == os.getenv("RECAP_DAY", "mon").lower():
        result["recap"] = run_weekly_recap()
    return result


def _user_id_from_metadata(obj: dict) -> Optional[int]:
    """Our user id stamped on the Stripe subscription's metadata (forja_user_id), if present."""
    raw = (obj.get("metadata") or {}).get("forja_user_id")
    try:
        return int(raw) if raw else None
    except (TypeError, ValueError):
        return None


def _set_subscription(
    customer_id: Optional[str],
    status: Optional[str],
    trial_iso: Optional[str],
    email: Optional[str] = None,
    user_id: Optional[int] = None,
) -> None:
    """Update a user's subscription state, resolving the user in priority order:
    user_id (from subscription metadata / client_reference_id) -> Stripe customer id -> email.
    This is order-robust: customer.subscription.* events resolve even if they arrive before the
    customer id was linked at checkout."""
    with get_conn() as conn:
        if user_id is not None:
            cur = conn.execute(
                "UPDATE users SET subscription_status = %s, trial_ends_at = %s, "
                "stripe_customer_id = COALESCE(%s, stripe_customer_id) WHERE id = %s",
                (status, trial_iso, customer_id, user_id),
            )
            if cur.rowcount:
                return
        if customer_id:
            cur = conn.execute(
                "UPDATE users SET subscription_status = %s, trial_ends_at = %s, stripe_customer_id = %s "
                "WHERE stripe_customer_id = %s",
                (status, trial_iso, customer_id, customer_id),
            )
            if cur.rowcount:
                return
        if email:
            conn.execute(
                "UPDATE users SET subscription_status = %s, trial_ends_at = %s, stripe_customer_id = %s "
                "WHERE email = %s",
                (status, trial_iso, customer_id, email.lower()),
            )


def _record_payment(email: str, description: str, amount: Optional[int], currency: Optional[str], stripe_id: str) -> bool:
    """Insert a paid order. Idempotent on stripe_id; returns True only on first insert."""
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO payments (email, description, amount, currency, status, stripe_id, at) "
            "VALUES (%s, %s, %s, %s, 'paid', %s, %s) ON CONFLICT (stripe_id) DO NOTHING",
            (email.lower(), description, amount, currency, stripe_id, now),
        )
        inserted = cur.rowcount > 0
    return inserted


@app.post("/api/stripe/webhook")
async def stripe_webhook(request: Request) -> dict:
    """Receives Stripe events. Payment Links and Checkout both emit checkout.session.completed;
    invoices emit invoice.paid. We record the order and email a receipt once (idempotently)."""
    payload = await request.body()

    if STRIPE_WEBHOOK_SECRET:
        import stripe

        try:
            event = stripe.Webhook.construct_event(
                payload, request.headers.get("Stripe-Signature"), STRIPE_WEBHOOK_SECRET
            )
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    else:
        # Dev only: accept unverified so you can test with the Stripe CLI before setting the secret.
        print("[stripe] WARNING: webhook signature NOT verified (set STRIPE_WEBHOOK_SECRET in prod)")
        try:
            event = json.loads(payload.decode() or "{}")
        except Exception:
            raise HTTPException(status_code=400, detail="Malformed payload")

    etype = event.get("type")
    obj = (event.get("data") or {}).get("object") or {}
    if not etype:
        return {"received": True}  # malformed / unrecognized envelope — ack so Stripe doesn't retry

    email: Optional[str] = None
    amount: Optional[int] = None
    currency: Optional[str] = None
    description = "Forja engagement"
    stripe_id: Optional[str] = None

    if etype == "checkout.session.completed":
        details = obj.get("customer_details") or {}
        email = details.get("email") or obj.get("customer_email")
        amount = obj.get("amount_total")
        currency = obj.get("currency")
        description = (obj.get("metadata") or {}).get("description") or description
        stripe_id = obj.get("id")
        # Subscription checkout completed = a paid conversion (our subscribe flow carries no
        # trial). Link the Stripe customer and mark the plan active; the subsequent
        # customer.subscription.* events then keep the exact status in sync (past_due, canceled…).
        if obj.get("mode") == "subscription" or obj.get("subscription"):
            ref = obj.get("client_reference_id")
            try:
                ref_id = int(ref) if ref else None
            except (TypeError, ValueError):
                ref_id = None
            _set_subscription(obj.get("customer"), "active", None, email=email, user_id=ref_id)
    elif etype.startswith("customer.subscription."):
        status = "canceled" if etype.endswith(".deleted") else obj.get("status")
        trial_end = obj.get("trial_end")
        trial_iso = (
            datetime.fromtimestamp(trial_end, tz=timezone.utc).isoformat() if trial_end else None
        )
        _set_subscription(obj.get("customer"), status, trial_iso, user_id=_user_id_from_metadata(obj))
        return {"received": True}
    elif etype in ("invoice.paid", "invoice.payment_succeeded"):
        email = obj.get("customer_email")
        amount = obj.get("amount_paid")
        currency = obj.get("currency")
        description = obj.get("number") or "Forja invoice"
        stripe_id = obj.get("id")
    else:
        return {"received": True}

    if email and stripe_id:
        is_new = _record_payment(email, description, amount, currency, stripe_id)
        if is_new:
            amount_display = (
                f"{(amount or 0) / 100:.2f} {(currency or 'eur').upper()}" if amount is not None else "—"
            )
            send_email(email, "Payment received — Forja", receipt_html(description, amount_display))

    return {"received": True}

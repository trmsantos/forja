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
import sqlite3
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field

from .db import get_conn, init_db
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
    hash_password,
    verify_password,
)

load_dotenv()

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:4000")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
PACKAGE_PRICES = {
    "audit": os.getenv("STRIPE_PRICE_AUDIT", ""),
    "automation-starter": os.getenv("STRIPE_PRICE_AUTOMATION", ""),
}

app = FastAPI(title="Forja API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:4000", "http://127.0.0.1:4000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer = HTTPBearer(auto_error=True)


@app.on_event("startup")
def _startup() -> None:
    init_db()


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


# ---------- helpers ----------
def _user_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "email_verified": bool(row["email_verified"]),
    }


def _send_verification(user_id: int, name: str, email: str) -> None:
    token = create_email_token(user_id, "verify")
    link = f"{FRONTEND_ORIGIN}/verify?token={token}"
    send_email(email, "Confirm your Forja account", verification_html(name, link))


def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    try:
        user_id = decode_token(creds.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name, email, email_verified FROM users WHERE id = ?", (user_id,)
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
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash, email_verified, created_at) VALUES (?, ?, ?, 0, ?)",
                (body.name, body.email.lower(), hash_password(body.password), now),
            )
            user_id = cur.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    _send_verification(user_id, body.name, body.email.lower())
    return {
        "token": create_token(user_id),
        "user": {"id": user_id, "name": body.name, "email": body.email.lower(), "email_verified": False},
    }


@app.post("/api/auth/login")
def login(body: LoginIn) -> dict:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name, email, email_verified, password_hash FROM users WHERE email = ?",
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
        conn.execute("UPDATE users SET email_verified = 1 WHERE id = ?", (user_id,))
        row = conn.execute(
            "SELECT id, name, email, email_verified FROM users WHERE id = ?", (user_id,)
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


@app.get("/api/account/requests")
def account_requests(user: dict = Depends(current_user)) -> list:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT service, message, at FROM leads WHERE email = ? ORDER BY at DESC",
            (user["email"],),
        ).fetchall()
    return [{"service": r["service"], "message": r["message"], "at": r["at"]} for r in rows]


@app.post("/api/leads")
def create_lead(lead: Lead) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO leads (name, email, company, service, message, at) VALUES (?, ?, ?, ?, ?, ?)",
            (lead.name, lead.email.lower(), lead.company, lead.service, lead.message, now),
        )
    send_email(
        STUDIO_EMAIL,
        f"New enquiry: {lead.service or 'general'} — {lead.name}",
        lead_notification_html(lead.name, lead.email, lead.company or "", lead.service or "", lead.message),
    )
    send_email(lead.email, "We got your message — Forja", lead_confirmation_html(lead.name))
    return {"ok": True}


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
            "SELECT description, amount, currency, status, at FROM payments WHERE email = ? ORDER BY at DESC",
            (user["email"],),
        ).fetchall()
    return [
        {"description": r["description"], "amount": r["amount"], "currency": r["currency"], "status": r["status"], "at": r["at"]}
        for r in rows
    ]


def _record_payment(email: str, description: str, amount: Optional[int], currency: Optional[str], stripe_id: str) -> bool:
    """Insert a paid order. Idempotent on stripe_id; returns True only on first insert."""
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT OR IGNORE INTO payments (email, description, amount, currency, status, stripe_id, at) "
            "VALUES (?, ?, ?, ?, 'paid', ?, ?)",
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

    etype = event["type"]
    obj = event["data"]["object"]

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

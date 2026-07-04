"""Email sending. Three transports, picked by what's configured:

  1. Resend  — if RESEND_API_KEY is set (HTTP API, std-lib only).
  2. SMTP    — else if SMTP_HOST + SMTP_USER are set (any provider: Gmail, your domain, Mailgun…).
  3. Console — else print to the server log, so the app runs locally with nothing configured.

Nothing here can raise into a request — a failed send just returns False and logs.
"""

import html
import json
import os
import ssl
import urllib.error
import urllib.request

# Verify TLS against certifi's CA bundle rather than OpenSSL's default paths, which are
# often absent on macOS python.org builds (and vary by host) — otherwise the HTTPS call
# to Resend dies with CERTIFICATE_VERIFY_FAILED. Falls back to the system store if certifi
# isn't installed.
try:
    import certifi

    _SSL_CTX: "ssl.SSLContext | None" = ssl.create_default_context(cafile=certifi.where())
except Exception:  # pragma: no cover - certifi is a declared dependency
    _SSL_CTX = ssl.create_default_context()

# Resend
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "Forja <onboarding@resend.dev>")
STUDIO_EMAIL = os.getenv("STUDIO_EMAIL", "hello@forja.studio")

# SMTP
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

_INK = "#15120e"
_EMBER = "#dc5424"


def _send_resend(to: str, subject: str, html: str, reply_to: "str | None" = None) -> bool:
    payload = {"from": EMAIL_FROM, "to": [to], "subject": subject, "html": html}
    if reply_to:
        payload["reply_to"] = reply_to
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            # Cloudflare (in front of Resend) blocks the default "Python-urllib" UA with
            # error 1010, so identify ourselves with a normal User-Agent.
            "User-Agent": "Forja/1.0 (+https://forja.studio)",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10, context=_SSL_CTX) as resp:
            rid = json.loads(resp.read() or b"{}").get("id")
            print(f"[email] Resend accepted '{subject}' -> {to} (id={rid})")
            return resp.status < 300
    except urllib.error.HTTPError as exc:
        # Surface Resend's reason (e.g. unverified sending domain) instead of a bare status.
        body = exc.read().decode("utf-8", "replace")
        print(f"[email] Resend rejected the send (HTTP {exc.code}): {body}")
        return False
    except Exception as exc:
        print("[email] Resend send failed:", exc)
        return False


def _send_smtp(to: str, subject: str, html: str, reply_to: "str | None" = None) -> bool:
    import smtplib
    import ssl
    from email.message import EmailMessage  # standard library

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM
    msg["To"] = to
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content("This message is best viewed in an HTML-capable email client.")
    msg.add_alternative(html, subtype="html")
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls(context=ssl.create_default_context())
            if SMTP_USER:
                server.login(SMTP_USER, SMTP_PASSWORD or "")
            server.send_message(msg)
        return True
    except Exception as exc:
        print("[email] SMTP send failed:", exc)
        return False


def send_email(to: str, subject: str, html: str, reply_to: "str | None" = None) -> bool:
    if RESEND_API_KEY:
        return _send_resend(to, subject, html, reply_to)
    if SMTP_HOST and SMTP_USER:
        return _send_smtp(to, subject, html, reply_to)
    print(f"\n[email:dev] would send to {to}\n  subject: {subject}\n  (set RESEND_API_KEY or SMTP_* to send for real)\n")
    return False


def _shell(body: str) -> str:
    return (
        f'<div style="font-family:Archivo,Arial,sans-serif;max-width:520px;margin:0 auto;'
        f'color:{_INK};line-height:1.6;">{body}'
        f'<p style="margin-top:32px;font-size:13px;color:#79746c;">Forja — get paid faster.</p></div>'
    )


def verification_html(name: str, link: str) -> str:
    return _shell(
        f'<h1 style="font-size:24px;">Confirm your email, {name}.</h1>'
        f'<p>Thanks for creating a Forja account. Confirm your email to finish setting it up.</p>'
        f'<p style="margin:28px 0;"><a href="{link}" '
        f'style="background:{_EMBER};color:#fff;text-decoration:none;padding:12px 22px;border-radius:4px;font-weight:600;">'
        f'Confirm email</a></p>'
        f'<p style="font-size:13px;color:#79746c;">Or paste this link into your browser:<br>{link}</p>'
        f'<p style="font-size:13px;color:#79746c;">This link expires in 24 hours.</p>'
    )


def password_reset_html(name: str, link: str) -> str:
    return _shell(
        f'<h1 style="font-size:24px;">Reset your password, {name}.</h1>'
        f'<p>We received a request to reset the password on your Forja account. Click below to '
        f'choose a new one. If you didn\'t ask for this, you can safely ignore this email.</p>'
        f'<p style="margin:28px 0;"><a href="{link}" '
        f'style="background:{_EMBER};color:#fff;text-decoration:none;padding:12px 22px;border-radius:4px;font-weight:600;">'
        f'Reset password</a></p>'
        f'<p style="font-size:13px;color:#79746c;">Or paste this link into your browser:<br>{link}</p>'
        f'<p style="font-size:13px;color:#79746c;">This link expires in 1 hour.</p>'
    )


def lead_notification_html(name: str, email: str, company: str, service: str, message: str) -> str:
    return _shell(
        f'<h1 style="font-size:22px;">New project enquiry</h1>'
        f'<p><strong>{name}</strong> &lt;{email}&gt;{(" · " + company) if company else ""}</p>'
        f'<p><strong>Interested in:</strong> {service or "Not specified"}</p>'
        f'<p style="background:#f0efec;padding:14px;border-radius:4px;">{message}</p>'
    )


def lead_confirmation_html(name: str) -> str:
    return _shell(
        f'<h1 style="font-size:24px;">Thanks, {name}.</h1>'
        f'<p>We have your message and will get back to you within two working days with whether '
        f'we are a fit and what a first step looks like.</p>'
    )


def receipt_html(description: str, amount_display: str) -> str:
    return _shell(
        f'<h1 style="font-size:24px;">Payment received.</h1>'
        f'<p>Thank you — we have received your payment. We\'ll be in touch with next steps.</p>'
        f'<table style="margin:20px 0;font-size:15px;border-collapse:collapse;">'
        f'<tr><td style="padding:6px 16px 6px 0;color:#79746c;">Item</td><td style="padding:6px 0;">{description}</td></tr>'
        f'<tr><td style="padding:6px 16px 6px 0;color:#79746c;">Amount</td><td style="padding:6px 0;"><strong>{amount_display}</strong></td></tr>'
        f'</table>'
        f'<p style="font-size:13px;color:#79746c;">A formal invoice from Stripe will arrive separately.</p>'
    )


def reminder_subject(step: int, studio: str, days_overdue: int) -> str:
    if step <= 1:
        return f"Reminder: your invoice from {studio} is overdue"
    if step == 2:
        return f"Second reminder: invoice from {studio} is {days_overdue} days overdue"
    return f"Final reminder: overdue invoice from {studio}"


def reminder_html(
    step: int,
    studio: str,
    debtor_name: str,
    amount_display: str,
    days_overdue: int,
    pay_url: "str | None" = None,
    tone: str = "friendly",
) -> str:
    """Escalating reminder sent to the debtor on behalf of the vendor.

    step escalates the pressure (1 gentle → 2 firmer → 3 final); tone sets the baseline voice the
    vendor chose: 'friendly' (warmer) or 'firm' (direct)."""
    # Escape names/URL from Stripe and registration before they enter the HTML.
    studio = html.escape(studio)
    debtor_name = html.escape(debtor_name)
    safe_url = html.escape(pay_url, quote=True) if pay_url else None
    s = 1 if step <= 1 else (2 if step == 2 else 3)
    tone = "firm" if tone == "firm" else "friendly"
    ref = f"your invoice from {studio} (<strong>{amount_display}</strong>)"
    copy = {
        ("friendly", 1): (f"Just a friendly reminder that {ref} is now {days_overdue} days past due.",
                          "If you've already sent payment, thank you — please ignore this note."),
        ("firm", 1): (f"This is a reminder that {ref} is now {days_overdue} days past due.",
                      "Please arrange payment at your earliest convenience."),
        ("friendly", 2): (f"A second reminder that {ref} is now {days_overdue} days overdue.",
                          "We'd really appreciate it if you could arrange payment soon."),
        ("firm", 2): (f"A second reminder: {ref} is now {days_overdue} days overdue.",
                      "Please settle this invoice promptly."),
        ("friendly", 3): (f"This is a final reminder that {ref} remains unpaid, now {days_overdue} days overdue.",
                          "Please arrange payment to avoid further follow-up. Thank you."),
        ("firm", 3): (f"Final reminder: {ref} remains unpaid and is {days_overdue} days overdue.",
                      "Please settle this invoice immediately to avoid further action."),
    }
    lead, close = copy[(tone, s)]

    button = (
        f'<p style="margin:28px 0;"><a href="{safe_url}" '
        f'style="background:{_EMBER};color:#fff;text-decoration:none;padding:12px 22px;border-radius:4px;font-weight:600;">'
        f'Pay this invoice</a></p>'
    ) if safe_url else ""

    return _shell(
        f'<h1 style="font-size:22px;">Hi {debtor_name},</h1>'
        f'<p>{lead}</p>'
        f'{button}'
        f'<p>{close}</p>'
        f'<p style="margin-top:24px;">Thank you,<br>{studio}</p>'
        f'<p style="font-size:12px;color:#9a958c;margin-top:20px;">Sent on behalf of {studio} via Forja.</p>'
    )


def recap_subject(studio: str) -> str:
    """Subject for the weekly recap sent to the Forja customer (never to debtors)."""
    return f"Your Forja week in review, {studio}"


def recap_html(
    studio: str,
    outstanding_display: str,
    recovered_display: str,
    reminders_sent: int,
    open_count: int,
    dashboard_url: "str | None" = None,
) -> str:
    """Weekly summary for the Forja customer: what's outstanding, what came in, and the work
    Forja did on their behalf this week. Same on-brand shell as the reminder emails."""
    studio = html.escape(studio)
    safe_url = html.escape(dashboard_url, quote=True) if dashboard_url else None

    def row(label: str, value: str, accent: bool = False) -> str:
        color = _EMBER if accent else _INK
        return (
            f'<tr><td style="padding:8px 16px 8px 0;color:#79746c;">{label}</td>'
            f'<td style="padding:8px 0;font-weight:600;color:{color};">{value}</td></tr>'
        )

    button = (
        f'<p style="margin:28px 0;"><a href="{safe_url}" '
        f'style="background:{_EMBER};color:#fff;text-decoration:none;padding:12px 22px;border-radius:4px;font-weight:600;">'
        f'Open your dashboard</a></p>'
    ) if safe_url else ""

    return _shell(
        f'<h1 style="font-size:22px;">Hi {studio},</h1>'
        f'<p>Here&rsquo;s how your collections are going this week.</p>'
        f'<table style="margin:20px 0;font-size:15px;border-collapse:collapse;">'
        f'{row("Outstanding", outstanding_display)}'
        f'{row("Recovered this week", recovered_display, accent=True)}'
        f'{row("Reminders sent", str(reminders_sent))}'
        f'{row("Open invoices", str(open_count))}'
        f'</table>'
        f'<p>Forja is watching your invoices and chasing the overdue ones for you. Nothing for you to do.</p>'
        f'{button}'
    )

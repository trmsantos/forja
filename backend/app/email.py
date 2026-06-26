"""Email sending. Three transports, picked by what's configured:

  1. Resend  — if RESEND_API_KEY is set (HTTP API, std-lib only).
  2. SMTP    — else if SMTP_HOST + SMTP_USER are set (any provider: Gmail, your domain, Mailgun…).
  3. Console — else print to the server log, so the app runs locally with nothing configured.

Nothing here can raise into a request — a failed send just returns False and logs.
"""

import html
import json
import os
import urllib.request

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
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status < 300
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
    step: int, studio: str, debtor_name: str, amount_display: str, days_overdue: int, pay_url: "str | None" = None
) -> str:
    """Escalating, polite-to-firm reminder sent to the debtor on behalf of the vendor."""
    # Escape names/URL from Stripe and registration before they enter the HTML.
    studio = html.escape(studio)
    debtor_name = html.escape(debtor_name)
    safe_url = html.escape(pay_url, quote=True) if pay_url else None
    if step <= 1:
        lead = (f"This is a friendly reminder that your invoice from {studio} "
                f"(<strong>{amount_display}</strong>) is now {days_overdue} days past due.")
        close = "If you've already paid, please ignore this note, and thank you."
    elif step == 2:
        lead = (f"A second reminder that your invoice from {studio} "
                f"(<strong>{amount_display}</strong>) is now {days_overdue} days overdue.")
        close = "Please arrange payment at your earliest convenience."
    else:
        lead = (f"This is a final reminder that your invoice from {studio} "
                f"(<strong>{amount_display}</strong>) remains unpaid and is {days_overdue} days overdue.")
        close = "Please settle this invoice promptly to avoid further follow-up."

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

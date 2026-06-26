# Forja — AI services studio website

A marketing + sales site for an AI services studio. Visitors learn what you do, **request a quote**,
**create an account** (with email confirmation), and **pay by Stripe link/invoice** after scoping —
their paid orders show up in their account. Dark "industrial forge" art direction, animated, responsive.

- **Brand:** Forja (Portuguese for *forge*) — "AI, forged into products that work." The logo is a
  maker's-mark stamp, deliberately not the sparkle/star icon that signals "AI".
- **Stack:** Vite + React + TypeScript + React Router (frontend) · Python FastAPI + SQLite (backend).

## Run it

Two terminals. macOS uses `python3`.

**Backend** — http://localhost:8010:

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8010
```

**Frontend** — http://localhost:4000 (proxies `/api` to the backend on 8010):

```bash
cd frontend
rm -rf node_modules package-lock.json   # ensures correct platform binaries (esbuild/rollup)
npm install
npm run dev
```

## Design & motion

Modern light direction: clean white/cool-gray canvas, ink text, a warm **ember** primary, and a small
set of soft tinted surfaces (blush / sky / mint) for category color — friendly and current without the
purple-gradient AI cliché. Display type **Bricolage Grotesque**, body **Plus Jakarta Sans** (neither on
Impeccable's overused list). Depth via soft shadows + rounded cards (not over-rounded). One dark band
(testimonials) for rhythm.

Motion uses **Framer Motion** (`framer-motion`), all `prefers-reduced-motion`-aware:

- Hero enters with a staggered spring; soft tinted chips float gently.
- Sections reveal on scroll-in via a shared `Reveal` spring wrapper (`whileInView`, once).
- Cards lift on hover (`whileHover`).
- The process timeline fills a progress line **scroll-linked** with `useScroll` / `useTransform`.

## Pages & routes

- `/` — hero, services, work/outcomes, process, testimonials, pricing (no prices shown), FAQ, contact.
- `/signup`, `/login`, `/verify` — account creation, sign-in, email confirmation.
- `/account` — protected dashboard: requests, **orders**, and an unverified-email banner.

## Auth + email confirmation

- `POST /api/auth/register` creates the account and emails a confirmation link to `/verify?token=…`.
- `POST /api/auth/verify`, `POST /api/auth/resend-verification`, `POST /api/auth/login`, `GET /api/auth/me`.
- Passwords hashed with **bcrypt**, sessions are signed **JWTs**. Users/leads/payments live in
  `backend/forja.db` (SQLite). Set a strong `JWT_SECRET` in production.

## Email — Resend OR SMTP (or console)

`backend/app/email.py` picks a transport automatically:

1. **Resend** if `RESEND_API_KEY` is set (HTTP API).
2. **SMTP** if `SMTP_HOST` + `SMTP_USER` are set — any provider. Gmail example: `SMTP_HOST=smtp.gmail.com`,
   `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`, `SMTP_PASSWORD=<Google App Password>`.
3. **Console** otherwise — prints the email to the server log so dev works with nothing configured.

Emails sent: account confirmation, new-lead notification to `STUDIO_EMAIL`, lead auto-reply, and a
payment receipt.

## Payments — pay by link (prices hidden)

Public prices are intentionally not shown; engagements are quoted. To take money:

1. Scope and quote the client, then send them a **Stripe Payment Link** or **invoice** from Stripe.
2. Stripe calls `POST /api/stripe/webhook`; the backend records the paid order (idempotent on the
   Stripe id), emails a receipt, and the order appears in the client's `/account`.

Handles `checkout.session.completed` (Payment Links + Checkout) and `invoice.paid`. Configure:

```bash
# local: forward events and copy the printed signing secret into .env as STRIPE_WEBHOOK_SECRET
stripe listen --forward-to localhost:8010/api/stripe/webhook
```

Without `STRIPE_WEBHOOK_SECRET`, the webhook accepts unverified events (dev only) so you can test
with the Stripe CLI. The on-site Checkout endpoint (`/api/checkout`) is still wired if you ever want
to re-enable fixed-price packages with visible prices.

## Verified

- Frontend: `tsc -b` clean; `vite build` bundles (61 modules) on a clean install.
- Backend: register → confirmation email → resend → verify → login → lead (studio + auto-reply
  emails) → account requests; and the Stripe webhook records an order, emails a receipt, is
  idempotent on duplicate events, and surfaces in `/account/payments`.

## Troubleshooting

- **`npm run build` rollup/esbuild "cannot find module":** npm optional-deps bug — `rm -rf
  node_modules package-lock.json && npm install`.
- **`python: command not found`** on macOS: use `python3`.
- **Port in use:** backend is on 8010; change with `--port` and update the proxy in `vite.config.ts`.

## Before launch

Strong `JWT_SECRET` + `FRONTEND_ORIGIN`; configure Resend/SMTP and Stripe (incl. the webhook signing
secret); replace illustrative outcomes/testimonials with real content; consider httpOnly-cookie
tokens. Frontend is an SPA — add a catch-all rewrite to `index.html` on your host.

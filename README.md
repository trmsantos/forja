# Forja — get paid faster

**Forja chases your overdue invoices for you.** Connect your Stripe account (read-only) and
Forja watches your invoices; when one slips past due it sends polite, escalating reminders with
the payment link until the client pays, then stops. Built for freelancers and small studios that
bill through Stripe. A simple dashboard shows what's outstanding, what's been chased, and how much
cash you've recovered.

- **Model:** a vertical micro-SaaS (accounts-receivable collections), €19 / €49 / €99 per month.
- **Stack:** Vite + React + TypeScript + React Router (frontend) · Python FastAPI (backend) · Postgres
  (Neon). Deployed on Vercel — static frontend plus a Python serverless API — with Vercel Cron
  driving the daily reminder sweep.
- **Design:** dark "forge" theme — Bricolage Grotesque display, Geist body, Geist Mono for figures.

## How it works (the core loop)

```
Customer connects Stripe (read-only restricted key)
   → Forja imports open invoices and watches due dates
   → a daily sweep (Collections Agent) sends escalating reminders for overdue ones
   → reminders stop the moment Stripe marks the invoice paid
   → dashboard shows outstanding · chased · recovered
```

Two distinct Stripe roles, don't confuse them:
1. **The customer's key** — a *read-only restricted key* (`rk_…`, Invoices: Read) the customer
   pastes in the dashboard. Stored **encrypted** (Fernet). Used only to read their invoices.
2. **Forja's own key** (`STRIPE_SECRET_KEY`) — your platform account, used to bill customers the
   €49/mo subscription (Stripe Billing + Customer Portal) and receive webhooks.

## Run it locally

Two terminals. macOS uses `python3`.

**Backend** — http://localhost:8010:

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip && pip install -r requirements.txt
cp .env.example .env            # fill in as needed; works with nothing set (console email, dry-run)
uvicorn app.main:app --reload --port 8010
```

**Frontend** — http://localhost:4000 (proxies `/api` to the backend on 8010):

```bash
cd frontend
npm install
npm run dev
```

Run the backend tests with the venv active: `python test_collections_agent.py`.

## Environment variables (full list)

Optional in dev except `DATABASE_URL` — otherwise the app falls back to console email, no payments,
and a dry-run agent. Set production values in the Vercel project (Settings → Environment Variables);
never commit `.env`.

| Var | Purpose |
|---|---|
| `DATABASE_URL` | **Required.** Postgres connection string. In prod use Neon's **pooled** URL. |
| `ENVIRONMENT` | `development` locally (lets the dev secret fallbacks work). In prod leave unset or set `production`: the app then **refuses to start** unless `JWT_SECRET` and `ENCRYPTION_KEY` are strong, non-default values. |
| `FRONTEND_ORIGIN` | Allowed CORS origin + link base. Set to your Vercel URL in prod. |
| `JWT_SECRET` | Signs login/verification tokens. Use a long random string (**not** the dev default). |
| `ENCRYPTION_KEY` | Encrypts customers' Stripe keys at rest. **Different** from `JWT_SECRET`; changing it makes stored keys undecryptable. |
| `CRON_SECRET` | Shared secret for the daily cron. Vercel Cron sends it as `Authorization: Bearer $CRON_SECRET`; `/api/cron/daily` rejects anything else. |
| `ADMIN_EMAIL` | The single account that can see owner analytics (`/api/admin/*`). |
| `STUDIO_EMAIL` | Where lead notifications go. |
| `EMAIL_FROM` | From address for all email. Use a **verified branded domain** (see below). |
| `RESEND_API_KEY` | Email via Resend (HTTP). If set, used first. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | Email via SMTP (used if no Resend key). |
| `STRIPE_SECRET_KEY` | **Forja's** account — bills customers + powers the Customer Portal. |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhook signatures. Without it, the webhook accepts unverified events (dev only). |
| `STRIPE_PRICE_AUDIT` / `STRIPE_PRICE_AUTOMATION` | Legacy fixed-package price IDs (optional). |
| `COLLECTIONS_ENABLED` | `1` to start the daily reminder sweep. Default `0` (off). |
| `COLLECTIONS_DRY_RUN` | `1` (default) logs reminders instead of emailing debtors. Set `0` to send for real. |
| `COLLECTIONS_HOUR` | Hour (UTC) of the daily sweep. Default `9`. |
| `COLLECTIONS_MAX_STEPS` | Max reminders per invoice. Default `3`. |
| `COLLECTIONS_MIN_GAP_DAYS` | Minimum days between reminders. Default `7`. |
| `RECAP_DAY` | Day of week (`mon`…`sun`) for the weekly customer recap email. Default `mon`. |
| `RECAP_HOUR` | Hour (UTC) for the weekly recap. Default `8`. Same `COLLECTIONS_ENABLED` gate + `COLLECTIONS_DRY_RUN` safety as the sweep. |

### Branded sender domain (recommended)

Reminders land in inboxes far more reliably when they come from **your** verified domain. With
Resend, verify your domain at resend.com/domains (it issues SPF/DKIM DNS records), then set
`EMAIL_FROM="Your Studio <billing@yourdomain>"`. With SMTP, use a mailbox on your own domain.
Reminders set `Reply-To` to the vendor so client replies reach them, not Forja.

## Deploy

Everything ships to **Vercel** from this one repo — the Vite frontend as a static build and the
FastAPI backend as a Python serverless function — backed by **Neon Postgres**, with **Vercel Cron**
running the daily reminder sweep. This is all wired up in [`vercel.json`](vercel.json); there's no
separate backend host and no in-process scheduler.

**1. Database — Neon Postgres.** Create a project at [neon.tech](https://neon.tech) and copy its
**pooled** connection string (the serverless API opens many short-lived connections, so pooling
matters). Create the tables once with `python backend/scripts/init_db.py` (or let the first request
create them lazily — `init_db()` is idempotent and runs on cold start).

**2. Deploy the repo to Vercel.** Import the GitHub repo (or `vercel --prod`). `vercel.json` already
declares both builds and routes `/api/*` to the Python function:

```jsonc
// vercel.json (already in the repo)
{
  "builds": [
    { "src": "frontend/package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } },
    { "src": "api/index.py", "use": "@vercel/python", "config": { "includeFiles": "backend/**" } }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.py" },
    { "handle": "filesystem" },
    { "src": "/(.+\\.[a-zA-Z0-9]+)", "dest": "/frontend/$1" },
    { "src": "/(.*)", "dest": "/frontend/index.html" }
  ],
  "crons": [{ "path": "/api/cron/daily", "schedule": "0 9 * * *" }]
}
```

Because the frontend and API share one origin, no `/api` proxy or CORS hop is needed — set
`FRONTEND_ORIGIN` to your Vercel URL anyway (it's the base for the links in emails).

**3. Set environment variables** in the Vercel project (Settings → Environment Variables) — at
minimum `DATABASE_URL`, a strong `JWT_SECRET` and `ENCRYPTION_KEY`, and `CRON_SECRET`; add
`RESEND_API_KEY` / `EMAIL_FROM`, the `STRIPE_*` keys, and `COLLECTIONS_*` as you switch features on.
Leave `ENVIRONMENT` unset in prod (or set `production`) so the weak-secret guard is active. See the
table above for the full list.

**4. Scheduling — Vercel Cron.** The `crons` entry above fires `GET /api/cron/daily` once a day
(09:00 UTC). Vercel sends `Authorization: Bearer $CRON_SECRET`, which the endpoint verifies before
running the sweep (and the weekly recap when the weekday matches `RECAP_DAY`). One endpoint keeps it
within Hobby's once-per-day cron limits.

**5. Stripe webhook.** Point it at `https://<your-app>.vercel.app/api/stripe/webhook` and set
`STRIPE_WEBHOOK_SECRET` so signatures are verified.

> Prefer a different host? The backend is a plain FastAPI app (`backend/app/main.py`), so it also runs
> under any ASGI server (`uvicorn app.main:app`) against the same `DATABASE_URL`. You'd then front the
> Vite SPA separately and proxy `/api` to it — but the Vercel path above is the supported setup.

## Dogfood it: connect Stripe → first sweep

1. Deploy (or run locally) with an email transport configured and `COLLECTIONS_DRY_RUN=1`.
2. In Stripe, create a **restricted key** (Developers → API keys → Create restricted key) with
   **Invoices: Read**. Copy the `rk_…` value.
3. Sign up, confirm your email, and on `/account` click **Connect your Stripe account**; paste the
   restricted key. Forja imports your open invoices.
4. Click **Run chase now** — with dry-run on it logs the reminders it *would* send and reports
   "X reminders sent, Y skipped." Review the server log and the dashboard.
5. When you trust it, set `COLLECTIONS_DRY_RUN=0` (and `COLLECTIONS_ENABLED=1` for the daily
   sweep). Forja now chases overdue invoices automatically.

## Auth, billing & the engine

- **Auth:** email + password (bcrypt), signed JWTs, email confirmation. `POST /api/auth/*`.
- **Billing:** Stripe subscription for the €49/mo plan; `POST /api/billing/portal` opens the
  Stripe Customer Portal; the webhook tracks `customer.subscription.*`.
- **Collections Agent** (`app/collections_agent.py`): the daily sweep, driven by Vercel Cron hitting
  `GET /api/cron/daily` (not an in-process scheduler) — per active connection it re-syncs from
  Stripe, then sends escalating reminders (step 1 gentle → step 3 final) for overdue open invoices,
  logging each and advancing its step. Stops at `COLLECTIONS_MAX_STEPS` and never sends two within
  `COLLECTIONS_MIN_GAP_DAYS`. Trigger a one-off sweep for the logged-in user with
  `POST /api/collections/run` (the "Run chase now" button). **Dry-run is the default** so it never
  emails real debtors until you opt in.
- **Weekly recap** (retention): runs inside the same daily cron — on the weekday matching `RECAP_DAY`
  it emails each subscribed customer a summary (outstanding · recovered this week · reminders sent ·
  open invoices). Goes to the *customer*, never to debtors; same `COLLECTIONS_ENABLED` gate and
  `COLLECTIONS_DRY_RUN` safety.

## Before launch

Strong `JWT_SECRET` + `ENCRYPTION_KEY` (with `ENVIRONMENT` unset/`production`, the app refuses to
boot without them) + `FRONTEND_ORIGIN`; verified email domain; Stripe Billing prices + webhook
signing secret; consider httpOnly-cookie tokens. Replace the illustrative outcomes/testimonials in
`frontend/src/lib/content.ts` with real ones.

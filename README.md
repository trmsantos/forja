# Forja — get paid faster

**Forja chases your overdue invoices for you.** Connect your Stripe account (read-only) and
Forja watches your invoices; when one slips past due it sends polite, escalating reminders with
the payment link until the client pays, then stops. Built for freelancers and small studios that
bill through Stripe. A simple dashboard shows what's outstanding, what's been chased, and how much
cash you've recovered.

- **Model:** a vertical micro-SaaS (accounts-receivable collections), €19 / €49 / €99 per month.
- **Stack:** Vite + React + TypeScript + React Router (frontend) · Python FastAPI + SQLite (backend).
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

All optional in dev — the app falls back to console email, no payments, and a dry-run agent.
Set them for production via `fly secrets set` (never commit `.env`).

| Var | Purpose |
|---|---|
| `FRONTEND_ORIGIN` | Allowed CORS origin + link base. Set to your Vercel URL in prod. |
| `JWT_SECRET` | Signs login/verification tokens. Use a long random string. |
| `ENCRYPTION_KEY` | Encrypts customers' Stripe keys at rest. **Different** from `JWT_SECRET`; changing it makes stored keys undecryptable. |
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

### Branded sender domain (recommended)

Reminders land in inboxes far more reliably when they come from **your** verified domain. With
Resend, verify your domain at resend.com/domains (it issues SPF/DKIM DNS records), then set
`EMAIL_FROM="Your Studio <billing@yourdomain>"`. With SMTP, use a mailbox on your own domain.
Reminders set `Reply-To` to the vendor so client replies reach them, not Forja.

## Deploy

### Backend — Fly.io

The backend is a FastAPI app with SQLite on a persistent volume (swap to Postgres/Supabase when
you outgrow a single file — see `app/db.py`).

```bash
cd backend
fly launch --no-deploy                 # creates fly.toml; pick a region
fly volumes create forja_data --size 1 # SQLite lives here
```

In `fly.toml`, mount the volume and point the DB at it, and run uvicorn:

```toml
[mounts]
  source = "forja_data"
  destination = "/data"

[env]
  PORT = "8080"

[processes]
  app = "uvicorn app.main:app --host 0.0.0.0 --port 8080"
```

Set `DB_PATH` handling: `app/db.py` keeps `forja.db` next to the app by default; for Fly, set the
DB into the mounted volume (e.g. symlink or extend `DB_PATH` to `/data/forja.db`). Then:

```bash
fly secrets set JWT_SECRET=... ENCRYPTION_KEY=... STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... \
  RESEND_API_KEY=... EMAIL_FROM="Your Studio <billing@yourdomain>" FRONTEND_ORIGIN=https://your-app.vercel.app \
  COLLECTIONS_ENABLED=1 COLLECTIONS_DRY_RUN=1
fly deploy
```

Point your Stripe webhook at `https://<fly-app>.fly.dev/api/stripe/webhook`.

### Frontend — Vercel

It's a Vite SPA. Build command `npm run build`, output dir `dist`. Add a `vercel.json` so `/api`
proxies to the Fly backend and client-side routes fall back to `index.html`:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://<fly-app>.fly.dev/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Set the backend's `FRONTEND_ORIGIN` to the Vercel domain so CORS allows it.

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
- **Collections Agent** (`app/collections_agent.py`): a daily `BackgroundScheduler` sweep —
  per active connection it re-syncs from Stripe, then sends escalating reminders (step 1 gentle →
  step 3 final) for overdue open invoices, logging each and advancing its step. Stops at
  `COLLECTIONS_MAX_STEPS` and never sends two within `COLLECTIONS_MIN_GAP_DAYS`. Trigger a
  one-off sweep for the logged-in user with `POST /api/collections/run` (the "Run chase now"
  button). **Dry-run is the default** so it never emails real debtors until you opt in.

## Before launch

Strong `JWT_SECRET` + `ENCRYPTION_KEY` + `FRONTEND_ORIGIN`; verified email domain; Stripe Billing
prices + webhook signing secret; consider httpOnly-cookie tokens and Postgres. Replace the
illustrative outcomes/testimonials in `frontend/src/lib/content.ts` with real ones.

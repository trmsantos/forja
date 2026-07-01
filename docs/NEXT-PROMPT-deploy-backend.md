You're in the **Forja** repo (AR-collections micro-SaaS: FastAPI backend in `backend/`, Vite/React frontend in `frontend/`). Deploy config already exists and is committed: `backend/Dockerfile`, `backend/fly.toml` (SQLite on a `/data` volume via `DB_PATH`, background scheduler always-on, `COLLECTIONS_DRY_RUN=1`), and `frontend/vercel.json`. Read `backend/RUNBOOK.md` and `backend/fly.toml` before acting.

**Task: deploy ONLY the backend to Fly.io now, in safe mode** — Stripe stays in TEST and `COLLECTIONS_DRY_RUN=1` (no real charges, no emails to debtors). Do NOT deploy the frontend yet and do NOT switch Stripe to live.

Steps:
1. Ensure flyctl is installed (`brew install flyctl` if missing). Run `fly auth whoami`; if it's not logged in, STOP and tell me to run `fly auth login` myself (it opens a browser — you can't do that step), then continue.
2. From `backend/`, run `fly launch --no-deploy`. When it detects the existing `fly.toml`, **keep its configuration** (don't let it overwrite the `[env]`, `[mounts]`, or the existing `Dockerfile`). Pick an available app name (try `forja-api`, else `forja-api-<something>`), region `mad` (Madrid). Decline Postgres/Redis/any add-ons.
3. Create the volume: `fly volumes create forja_data --size 1 --region mad --yes`.
4. Set secrets (runs locally; read Stripe/Resend values from `backend/.env`, and generate fresh auth secrets for prod):
   ```
   fly secrets set \
     JWT_SECRET="$(openssl rand -hex 32)" \
     ENCRYPTION_KEY="$(openssl rand -hex 32)" \
     STRIPE_SECRET_KEY="$(grep '^STRIPE_SECRET_KEY=' .env | cut -d= -f2-)" \
     STRIPE_PRICE_SOLO="$(grep '^STRIPE_PRICE_SOLO=' .env | cut -d= -f2-)" \
     STRIPE_PRICE_STUDIO="$(grep '^STRIPE_PRICE_STUDIO=' .env | cut -d= -f2-)" \
     STRIPE_PRICE_AGENCY="$(grep '^STRIPE_PRICE_AGENCY=' .env | cut -d= -f2-)" \
     RESEND_API_KEY="$(grep '^RESEND_API_KEY=' .env | cut -d= -f2-)"
   ```
   Leave `STRIPE_WEBHOOK_SECRET` and `EMAIL_FROM` unset for now (webhook + verified domain come in a later step).
5. Keep `fly.toml` `[env]` as is: `DB_PATH=/data/forja.db`, `COLLECTIONS_ENABLED=1`, `COLLECTIONS_DRY_RUN=1`. Leave `FRONTEND_ORIGIN` as the placeholder — we set the real domain after the Vercel deploy.
6. `fly deploy`.
7. Verify: `curl -s https://<app>.fly.dev/api/health` must return `{"status":"ok"}`. Then `fly logs` should show "Application startup complete" plus the `[collections] scheduler started` and `[recap] weekly recap scheduled` lines.

Guardrails: never put secrets in `fly.toml` or commit them — `.env` stays local. Don't switch Stripe to live. Don't deploy the frontend. If a step needs my interactive input (login, picking a name), pause and tell me exactly what to type.

When done, report back: the final app name + URL (`https://<app>.fly.dev`), the `/api/health` result, and any errors. I'll use that URL for the next step (point `vercel.json` + the Stripe webhook at it).

You're in the **Forja** repo (AR-collections micro-SaaS). Backend: FastAPI in `backend/app/` (SQLite + in-process APScheduler). Frontend: Vite/React in `frontend/`. Read `README.md`, `RUNBOOK.md`, and every file in `backend/app/` before changing anything.

**Goal: make the whole app run on a single free Vercel (Hobby) project** — Vite frontend + Python serverless API — with **Postgres (Neon)** as the database and **Vercel Cron** replacing the background scheduler.

**Work on a new branch `vercel-postgres`.** Keep Stripe in TEST mode and `COLLECTIONS_DRY_RUN=1` throughout. Never commit `.env` or any secret. After each phase, run its verification and report before moving on. Whenever a step needs me (browser login, Vercel/Neon dashboard, picking names), PAUSE and tell me exactly what to do.

### Phase 1 — Postgres data layer
- `requirements.txt`: add `psycopg[binary]>=3.2`; remove `APScheduler` (unused after this migration).
- Rewrite `backend/app/db.py` to connect to Postgres via the `DATABASE_URL` env var (Neon **pooled** connection string). Use psycopg3 with `from psycopg.rows import dict_row` so `row["col"]` keeps working everywhere. Keep `get_conn()` usable as `with get_conn() as conn:` and make it commit on success / roll back on error.
- Port the schema to Postgres DDL: `BIGSERIAL PRIMARY KEY` (not `INTEGER PRIMARY KEY AUTOINCREMENT`); keep `TEXT`/`INTEGER`; drop `PRAGMA foreign_keys` (Postgres enforces FKs natively); keep `ON CONFLICT (...) DO UPDATE`/`DO NOTHING`. Replace the `_ensure_column`/`PRAGMA table_info` migrations by defining all columns in `CREATE TABLE IF NOT EXISTS` (the prod DB is fresh).
- Across `main.py`, `stripe_sync.py`, `collections_agent.py`: convert every SQL placeholder `?` → `%s`; replace `cur.lastrowid` with `INSERT ... RETURNING id`; replace `INSERT OR IGNORE` with `INSERT ... ON CONFLICT DO NOTHING`.
- Add `backend/scripts/init_db.py` that calls `init_db()` (idempotent) against `DATABASE_URL`.
- Verify: with a local/Neon `DATABASE_URL` set, `python backend/scripts/init_db.py` creates all tables without error.

### Phase 2 — Serverless API
- Create `api/index.py` at the repo root that exposes the FastAPI app for Vercel's Python runtime (e.g. `from backend.app.main import app`). Make `backend` importable from the function (add `__init__.py` where needed; confirm the relative imports in `backend/app` still resolve). Put a `requirements.txt` where Vercel's Python build will find it for the function.
- Remove the in-process scheduler (`_maybe_start_scheduler` / the APScheduler startup) — serverless has no background process. Keep `init_db()` running on startup but guarded so it's cheap on cold starts. Keep `run_sweep()` and `run_weekly_recap()` importable.
- Add a single protected cron endpoint `GET /api/cron/daily`, guarded by `CRON_SECRET` (Vercel sends `Authorization: Bearer $CRON_SECRET`): it runs `run_sweep()` every day and ALSO runs `run_weekly_recap()` when today's weekday == `RECAP_DAY`. One endpoint avoids Hobby's once-per-day / cron-count limits. Return 401 without the correct bearer.
- Verify: `python -c "from backend.app.main import app"` imports cleanly; the cron endpoint rejects a request with no/invalid bearer.

### Phase 3 — Vercel project config
- Replace `frontend/vercel.json` with a single root `vercel.json` for the combined project:
  - build the Vite frontend (`frontend/`, output `dist`),
  - route `/api/(.*)` → the Python function (`api/index.py`),
  - SPA fallback `/(.*)` → `/index.html`,
  - `"crons": [{ "path": "/api/cron/daily", "schedule": "0 9 * * *" }]`,
  - `functions` maxDuration 60.
- The frontend already calls `/api/...` (same origin in prod — no proxy needed). Keep the local vite proxy only if it doesn't interfere with `vercel dev`.

### Phase 4 — DB + env (interactive — pause for me)
- Tell me to create a **Neon Postgres (free)**: via Vercel Dashboard → Storage → Neon integration (auto-injects `DATABASE_URL`), or at neon.tech and copy the **pooled** connection string.
- List the env vars I must set on Vercel (and in a local `.env` for `vercel dev`): `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `STRIPE_SECRET_KEY` (test), `STRIPE_PRICE_SOLO/STUDIO/AGENCY` (test), `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_ORIGIN` (the Vercel URL), `CRON_SECRET`, `COLLECTIONS_DRY_RUN=1`. Generate fresh `JWT_SECRET`/`ENCRYPTION_KEY`/`CRON_SECRET`.
- Run `python backend/scripts/init_db.py` once against the Neon `DATABASE_URL` to create the tables.

### Phase 5 — Verify & deploy
- `vercel dev` locally: site loads, `GET /api/health` → `{"status":"ok"}`, register/login works, the free audit works, starting a trial works (Stripe test card 4242 4242 4242 4242). Confirm `/api/cron/daily` is rejected without the bearer and runs (dry-run) with it.
- Adapt `backend/test_collections_agent.py` to run against a Postgres test DB (use `DATABASE_URL`); keep ALL tests green. Keep `cd frontend && npx tsc --noEmit` clean.
- Deploy a preview with `vercel`, then `vercel --prod` once it checks out.

**Guardrails:** branch `vercel-postgres`; Stripe TEST only; `COLLECTIONS_DRY_RUN=1`; never commit secrets (`.env` stays local / Vercel env only); leave the existing Fly/Docker files in place (they document the container option). Pause for any interactive step and tell me exactly what to paste/click.

**Report at the end:** the Vercel preview/prod URL, the `/api/health` result, the test results, and a short list of every file you changed and any decisions you made.

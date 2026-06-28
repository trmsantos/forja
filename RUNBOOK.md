# Forja — Go-Live Runbook (copy-paste, macOS)

Everything below is meant to be pasted into your terminal, top to bottom. It takes Forja from
"runs locally" to "can actually charge customers". Commands assume macOS + zsh and that you're in
the project root (the folder that contains `backend/` and `frontend/`).

```bash
cd ~/Claude/Projects/Idea/forja   # adjust if your path differs
```

---

## 1. Run it locally (two terminals)

**Terminal A — backend (http://localhost:8010):**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip && pip install -r requirements.txt
cp -n .env.example .env            # keep your existing .env if you already have one
uvicorn app.main:app --reload --port 8010
```

**Terminal B — frontend (http://localhost:4000):**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:4000 and confirm the site loads (you should now see the new
**"More than Stripe's built-in reminder."** section and a **Why Forja** nav link).

---

## 2. Install + connect the Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
stripe login          # opens the browser; approve the pairing
```

By default the CLI talks to your account in **test mode** — perfect for setting everything up
without touching real money.

---

## 3. Create the three subscription plans

This creates each product **and** its monthly price in one command, and prints a `price_...` id.
Copy each id — you'll paste them into `.env` next.

```bash
# Solo — €19/mo
stripe prices create \
  --unit-amount 1900 --currency eur \
  -d "recurring[interval]=month" \
  -d "product_data[name]=Forja Solo"

# Studio — €49/mo
stripe prices create \
  --unit-amount 4900 --currency eur \
  -d "recurring[interval]=month" \
  -d "product_data[name]=Forja Studio"

# Agency — €99/mo
stripe prices create \
  --unit-amount 9900 --currency eur \
  -d "recurring[interval]=month" \
  -d "product_data[name]=Forja Agency"
```

From each command's output, copy the value of `"id": "price_..."`.

Also grab your **test secret key**:

```bash
stripe config --list | grep test_mode_api_key   # or copy sk_test_... from the Stripe Dashboard
```

---

## 4. Forward webhooks to your local backend

Leave this running in its **own terminal** while you test — it prints a signing secret and relays
Stripe events to Forja:

```bash
stripe listen --forward-to localhost:8010/api/stripe/webhook
```

It prints a line like `Ready! Your webhook signing secret is whsec_xxx`. Copy that `whsec_...`.

---

## 5. Fill in `.env`

Open `backend/.env` and set these (use the values you copied above):

```bash
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_SOLO=price_xxx
STRIPE_PRICE_STUDIO=price_xxx
STRIPE_PRICE_AGENCY=price_xxx
TRIAL_DAYS=14
```

Restart the backend (Ctrl-C in Terminal A, then `uvicorn app.main:app --reload --port 8010`).

---

## 6. Test the whole money flow (test mode)

1. Go to http://localhost:4000/signup and create an account.
2. On **/account**, follow the new 3-step card to create a Stripe **restricted key** (Invoices →
   Read), and connect it.
3. Click **Start trial · Studio €49/mo** → you're sent to Stripe Checkout.
4. Pay with the Stripe **test card**: `4242 4242 4242 4242`, any future expiry, any CVC/ZIP.
5. You're redirected back to **/account** — the plan flips to **trialing** and **Run chase now**
   unlocks. The `stripe listen` terminal shows the events firing.

Confirm the backend tests still pass:

```bash
cd backend && source .venv/bin/activate && python test_collections_agent.py
```

---

## 7. Going live (when you're ready to email real clients)

1. **Verify your sending domain** in Resend (adds SPF/DKIM DNS records):
   - https://resend.com/domains → add `forja.studio` → add the DNS records at your registrar.
   - Then set in `.env`: `EMAIL_FROM="Forja <hello@forja.studio>"` and your real `RESEND_API_KEY`.
2. **Switch the engine on, but stay in dry-run first** (logs reminders instead of sending):
   ```bash
   # in backend/.env
   COLLECTIONS_ENABLED=1
   COLLECTIONS_DRY_RUN=1
   ```
   Review the logs / dashboard. When you trust it, flip `COLLECTIONS_DRY_RUN=0` to send for real.
3. Switch your Stripe keys + prices from `sk_test_…` / `price_…(test)` to **live** ones, and point
   a **live** webhook at your deployed `/api/stripe/webhook` (next section).

---

## 8. Deploy

**Backend → Fly.io:**

```bash
cd backend
brew install flyctl
fly launch --no-deploy                 # creates fly.toml; pick a region (e.g. mad / cdg)
fly volumes create forja_data --size 1 # SQLite lives here
fly secrets set \
  JWT_SECRET="$(openssl rand -hex 32)" \
  ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  STRIPE_SECRET_KEY=sk_live_xxx \
  STRIPE_WEBHOOK_SECRET=whsec_live_xxx \
  STRIPE_PRICE_SOLO=price_live_xxx \
  STRIPE_PRICE_STUDIO=price_live_xxx \
  STRIPE_PRICE_AGENCY=price_live_xxx \
  RESEND_API_KEY=re_xxx \
  EMAIL_FROM="Forja <hello@forja.studio>" \
  FRONTEND_ORIGIN=https://your-app.vercel.app \
  COLLECTIONS_ENABLED=1 COLLECTIONS_DRY_RUN=1
fly deploy
```

(Mount the volume + point the DB at `/data/forja.db` in `fly.toml` — see the README "Deploy"
section for the exact `[mounts]` / `[processes]` block.)

**Frontend → Vercel:**

```bash
cd ../frontend
npm i -g vercel
vercel            # follow prompts; build command: npm run build, output dir: dist
```

Add a `vercel.json` so `/api` proxies to Fly and client routes fall back to `index.html` (template
in the README). Then in the Stripe Dashboard, add a **live** webhook pointing to
`https://<your-fly-app>.fly.dev/api/stripe/webhook` and copy its `whsec_…` into `fly secrets`.

---

## 9. (Optional) Commit the work

```bash
cd ~/Claude/Projects/Idea/forja
git add -A
git commit -m "feat: subscription checkout + paywall, Stripe-vs-Forja section, smoother onboarding"
git push
```

---

### Quick reference — what changed in the code this round

- `POST /api/billing/subscribe` — starts a Stripe Checkout subscription with a 14-day trial.
- Paywall — the collections engine (manual + daily sweep) now requires an active/trialing plan.
- Account page — "Start trial" buttons + a 3-step Stripe-connect guide; "Run chase" is gated.
- Landing — a new **"More than Stripe's built-in reminder"** comparison section + FAQ + nav link.
- `.env.example` — new `STRIPE_PRICE_SOLO/STUDIO/AGENCY` + `TRIAL_DAYS`.

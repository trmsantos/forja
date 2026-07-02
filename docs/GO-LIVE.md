# Go-Live Checklist — switching Forja from test to live

Everything below is **operational config** (Stripe dashboard + Vercel env). No code changes are
needed to go live — the app already handles the full paid-conversion flow. Do these in order.

> Model recap: a user signs up → connects Stripe (read-only) → a **14-day self-managed free
> trial** starts automatically (no card) → chasing runs → they **convert to a paid plan** via
> Stripe Checkout. "Buy it" = that paid conversion working in **live** mode.

---

## 0. Prerequisites
- [ ] **Resend domain verified** (`forja.studio`) and `EMAIL_FROM` set to your domain (e.g. `Forja <notifications@forja.studio>`). Until then Resend only delivers to the account owner, so real customers won't get verification emails or reminders. See the Resend/DNS notes.
- [ ] Decide the sending switch: keep **`COLLECTIONS_DRY_RUN=1`** (logs instead of emailing debtors) until you've watched a real chase; flip to `0` only when ready to actually email clients.

## 1. Stripe — create live products & prices
- [ ] In the Stripe dashboard, toggle to **Live mode**.
- [ ] Create three recurring products/prices (monthly): **Solo €19**, **Studio €49**, **Agency €99**.
- [ ] Copy each **live price id** (`price_…`).

## 2. Stripe — keys & webhook
- [ ] Copy your **live secret key** (`sk_live_…`).
- [ ] Create a **webhook endpoint** (Developers → Webhooks) pointing to:
      `https://<your-domain>/api/stripe/webhook`
- [ ] Subscribe it to these events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_succeeded`
- [ ] Copy the endpoint's **signing secret** (`whsec_…`).

## 3. Vercel — set Production environment variables
Set these on the Vercel project (Settings → Environment Variables → Production), then **redeploy**:
- [ ] `STRIPE_SECRET_KEY` = `sk_live_…`
- [ ] `STRIPE_PRICE_SOLO` = live Solo price id
- [ ] `STRIPE_PRICE_STUDIO` = live Studio price id
- [ ] `STRIPE_PRICE_AGENCY` = live Agency price id
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_…`
- [ ] `EMAIL_FROM` = `Forja <notifications@forja.studio>`
- [ ] `COLLECTIONS_DRY_RUN` = `1` for now (flip to `0` when ready to send for real)
- [ ] Confirm `FRONTEND_ORIGIN`, `JWT_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`, `DATABASE_URL`, `RESEND_API_KEY` are all set for Production.

## 4. Smoke test the money path (live)
- [ ] Create a fresh account; confirm the **verification email** arrives (proves Resend domain works).
- [ ] Connect a **live, read-only** Stripe restricted key (Invoices: Read); confirm the **trial auto-starts** and the dashboard shows "Free trial · N days left."
- [ ] Click **Subscribe** on a plan → complete Checkout with a real card → confirm you land back on `/account`, status shows **active**, and **"Manage billing"** appears.
- [ ] Confirm a **receipt email** arrives.
- [ ] Open **Manage billing** (Customer Portal) → cancel → confirm the account flips out of active (webhook working).

## 5. Turn on real sending (when ready)
- [ ] Create/allow one genuinely overdue invoice you control, keep `COLLECTIONS_DRY_RUN=1`, run a chase from the dashboard, and read the logs to confirm the *right* reminder would go out.
- [ ] Set **`COLLECTIONS_DRY_RUN=0`** and redeploy. From here the daily cron sends real reminders to overdue debtors.

## 6. Portugal / tax
- [ ] Sort **certified invoicing + VAT** for your own subscription billing (your obligation as the seller). Stripe Billing auto-generates subscription invoices/receipts, but PT has specific certified-software requirements — check before charging EU customers at scale.

---

## Rollback / kill switch
- Stop all outbound chasing instantly: set `COLLECTIONS_DRY_RUN=1` and redeploy.
- Fully revert to test: swap `STRIPE_SECRET_KEY`, the price ids, and `STRIPE_WEBHOOK_SECRET` back to their test values.

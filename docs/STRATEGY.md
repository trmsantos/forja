# Forja — Strategy & Roadmap

_Owner: Tomás · Last updated: 2 July 2026_

This is the operating plan: what Forja is, who pays for it, and the concrete path from €0 to
**€20,000+/year** — in small, verifiable steps. It is deliberately honest about the ceiling and
the risks, because the fastest way to waste a year is to build confidently in the wrong direction.

---

## 1. North star & the honest ceiling

**North star:** €20k/year in recurring revenue within ~12 months. That is **€1,667/mo MRR ≈ 34
Studio (€49) customers** — or a blend of ~25–40 accounts. This is a realistic, achievable target
for a focused solo micro-SaaS.

**Be honest about the ceiling.** Forja sits on top of Stripe and overlaps features Stripe gives
away. That caps the easy upside: this is a **great €20k–60k/year solo business** if we win a
distribution channel and a sharp niche — it is **not** a venture-scale company, and pretending
otherwise leads to over-building. We optimise for durable margin and low effort-to-serve, not
hyper-growth.

Milestone ladder:

| Milestone | MRR | ~Customers (mostly €49) | What it proves |
|---|---|---|---|
| First paying customer | ~€49 | 1 | Someone will pay real money |
| Ramen / signal | €500/mo | ~11 | The wedge + a channel work |
| **Goal** | **€1,667/mo (€20k/yr)** | **~34** | A real, defensible small business |
| Stretch | €3–5k/mo | 60–100 | Worth going full-time on |

---

## 2. Who we sell to (ICP) — and who we don't

The single biggest correction to the original plan: **stop leading with solo freelancers.**

**Primary ICP — the owner-run studio/agency (5–15 people).**
- Invoices through Stripe, several five-figure invoices outstanding, 2–4 slip past due each month.
- **No dedicated finance person** — chasing falls on the founder or an office manager who hates it.
- Too small for Chaser (£199/mo) or a bookkeeper-on-retainer; big enough that a dropped follow-up
  costs real money.
- **Willingness to pay €49–99/mo is high** because one recovered invoice dwarfs the fee.

**Secondary — the high-earning solo consultant / small dev shop** billing €3k–20k invoices where
a single late payment is a cash-flow event. Lower volume, but high pain-per-invoice.

**Who we do NOT chase (yet):**
- **Low-volume solo freelancers** (2–3 small invoices/month). Real pain, but lowest willingness to
  pay, free substitutes everywhere (Stripe, Wave, their accounting tool), and highest churn. The
  €19 tier stays as an on-ramp, but it is **not** the hero and not where we spend marketing.
- **Finance teams / ≥500 invoices/month.** Highest WTP in the market, but that's Chaser / Upflow /
  YayPay territory ($200–650+/mo) and a different product. Not our fight.

**One-line ICP:** _owner-run studios and agencies on Stripe, without a finance person, who lose
money to invoices they forget to chase._

---

## 3. Positioning & the real wedge (vs Stripe)

**Kill the false claim.** Stripe **does** send multiple scheduled reminders (before/on/after due,
with logo/colour branding). Any messaging built on "Stripe only sends one reminder" is factually
wrong and destroys credibility. It's also gated behind Stripe's Billing **Plus** plan.

**What Stripe genuinely cannot do — this is our entire wedge:**
1. **Custom, escalating wording.** Stripe uses one fixed template for everyone. Forja sends a
   gentle → firm → final sequence **in your studio's own words and name**.
2. **A recovered-cash view.** Stripe shows you nothing about what chasing brought back. Forja's
   whole dashboard is "here's the money we recovered for you."
3. **Zero per-invoice setup.** Stripe reminders are configured invoice by invoice. Forja: connect
   once, every overdue invoice is chased automatically.

**Positioning statement:** _For studios on Stripe without a finance person, Forja is the autopilot
that chases every overdue invoice in your own voice — and shows you the cash it brings back —
without the per-invoice setup, generic template, or blind spots of Stripe's built-in reminders._

**Do not advertise features we haven't built** (e.g. SMS). Claims must be true today; roadmap
items live in §6, not on the landing page.

---

## 4. Offer & pricing

Keep the three-tier structure and prices (already wired to Stripe). Shift the **narrative**, not
the numbers:

- **Solo — €19/mo.** On-ramp for one-person studios. Present, not promoted.
- **Studio — €49/mo (featured, default).** The hero tier. Unlimited invoices, custom tone, weekly
  recap. All copy and CTAs aim here.
- **Agency — €99/mo.** Multiple Stripe accounts, branded sender. "Talk to us" is fine but should
  show the price so it doesn't read as a bait-and-switch beside self-serve tiers.

**Pricing frame that works:** _"Recover one late invoice and Forja has more than paid for itself."_
True at every tier and worth keeping front-and-centre.

**Trial:** 14 days, **no card to start** (implemented via Stripe Checkout
`payment_method_collection=if_required`). Low friction wins more trials than a card wall; the
tradeoff (more trials that don't convert) is acceptable at this stage and re-evaluated once we have
conversion data.

---

## 5. The funnel

```
Free overdue-invoice AUDIT  →  Sign up (no card)  →  Connect Stripe  →  Trial starts  →  Paid
        (aha: "you have €X overdue")                (activation)        (recover cash)   (keep)
```

- The **free audit** is the top-of-funnel weapon: paste a read-only key, instantly see overdue €.
  It must flow *into* onboarding (carry the number and the "aha" into signup) instead of dead-ending
  at a generic signup. **This is the highest-ROI build after repositioning** (see §6, Phase 1).
- **Activation = connect Stripe.** Everything before "connected" is friction to minimise. Track the
  signup → connected rate; it is the most important number in the business.
- **Retention = visible recovered cash + the weekly recap email.** People keep paying for a tool
  that visibly makes them money. The recap is the retention engine — keep it excellent.

---

## 6. Roadmap (phased)

### Phase 0 — Fix the foundation _(this PR)_
Reposition to studios; correct the false Stripe claim; remove fabricated testimonials/results;
fix pre-pivot copy; make "no card to start" true; put trust/why-Stripe higher on the page.
**Goal: the site tells the truth and sells the real wedge.**

### Phase 1 — First 10 customers (→ €500/mo)
- Wire the **audit → signup** handoff (carry the recovered-€ number; don't make them re-paste).
- Tighten activation: reduce the connect-Stripe steps; consider auto-starting the trial on connect.
- Manual distribution: direct outreach to studios/agencies, freelancer & agency communities
  (Indie Hackers, relevant Slacks/Discords, r/freelance), and 5–10 "free audit" DMs/week.
- **Get forja.studio verified in Resend** so reminders send from our own domain (blocker for real use).
- Collect the **first real testimonials & a real recovered-€ number** to replace the removed fakes.

### Phase 2 — The distribution unlock (→ €20k/yr)
- **Build & list a Stripe App on the Stripe App Marketplace.** This is the single best channel: a
  small, uncrowded marketplace with free distribution to Stripe's customer base, and it *forces* the
  one-click "connect once" experience we already promise. This is the bet that makes €20k realistic
  without an ad budget.
- SEO content on "chase overdue Stripe invoices / late payment" — slow, compounding, zero-CAC.

### Phase 3 — Defensibility & higher WTP (→ €3–5k/mo)
- **SMS/WhatsApp reminders** (multi-channel is the most defensible gap vs Stripe and lifts recovery
  rates materially). Justifies the Agency tier and a possible price rise.
- Branded sender domain per customer; multi-Stripe-account support; deeper analytics.
- Explore **accountant/bookkeeper referral** partnerships once the product is proven.

---

## 7. Metrics we watch

| Metric | Why | Healthy signal |
|---|---|---|
| Signup → **connected** rate | Activation is the whole game | > 40% |
| **Recovered €** per active account | The value we deliver (and our best marketing) | trending up |
| **Monthly churn** | The silent killer at this ACV | < 5% |
| Trial → paid conversion | Is the wedge worth money? | > 20% |
| CAC | Must stay near €0 (organic only) | ≈ €0 |

---

## 8. Risks & kill-criteria

**Top risks:** (1) Stripe ships editable reminder copy / SMS and erases the wedge; (2) prosumer
churn (3–5%/mo) outruns acquisition; (3) trust barrier — people hesitate to let a tool email their
clients; (4) the Stripe-Invoicing niche is simply too small.

**Mitigations:** lean into recovered-cash visibility + tone control (hardest for Stripe to
commoditise); make the weekly recap a retention moat; over-invest in trust (read-only, sends in
your name, EU-hosted, encrypted); win the marketplace channel early.

**Honest kill-criteria — revisit the whole thing if:**
- After Phase 1 outreach (~50 real conversations / 3 months), we can't get **10 paying customers**, or
- Trial → paid stays **< 10%**, or
- Stripe releases custom reminder copy **and** SMS.

If two of these hit, the right move is to pivot the wedge (e.g. up-market to small finance teams, or
a specific vertical) rather than pour more effort into the same funnel.

---

## 9. What "done" looks like for each step

- **Phase 0:** merged; site is honest and studio-focused. _(this PR)_
- **Phase 1:** audit→signup wired, domain verified, first 10 paying customers, first real proof.
- **Phase 2:** Stripe App live in the Marketplace; €20k/yr run-rate.
- **Phase 3:** multi-channel shipped; churn < 5%; €3–5k/mo.

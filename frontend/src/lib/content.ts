// Single source of truth for all site copy + offerings.
// Forja is an AR-collections SaaS: it connects to a customer's Stripe (read-only) and
// auto-chases their overdue invoices. ICP = owner-run studios/agencies on Stripe without a
// finance person (see docs/STRATEGY.md). Copy avoids buzzwords, minimal em-dashes.
//
// Honesty rules (do not break — they protect credibility):
//   1. Stripe DOES send scheduled reminders. Our wedge is custom escalating wording, sending in
//      your name, a recovered-cash dashboard, and zero per-invoice setup — never "Stripe only
//      sends one reminder."
//   2. Never advertise features we haven't shipped (e.g. SMS lives on the roadmap, not here).
//   3. No fabricated testimonials or invented result metrics until we have real ones.

export const brand = {
  name: "Forja",
  meaning: "Portuguese for forge",
  tagline: "Get paid faster, without the awkward chasing.",
  intro:
    "Forja connects to your Stripe with a read-only key and chases your overdue invoices for you — escalating, on-brand reminders in your studio's name, until the client pays.",
  email: "hello@forja.studio",
};

export type Service = {
  id: string;
  title: string;
  blurb: string;
  bullets: string[];
};

export const services: Service[] = [
  {
    id: "connect",
    title: "Connect Stripe in a minute",
    blurb:
      "Paste a read-only key. Forja imports your open invoices and starts watching the ones that slip past due.",
    bullets: ["Read-only access", "Your data stays in Stripe", "Imports in seconds", "Disconnect anytime"],
  },
  {
    id: "chase",
    title: "Reminders that escalate, in your voice",
    blurb:
      "Forja sends on-brand emails on a smart schedule, gentle then firmer, each with the Stripe payment link, until the invoice is paid.",
    bullets: ["Gentle → firm → final", "Your studio, your sender", "Payment link included", "Stops once it's paid"],
  },
  {
    id: "track",
    title: "See the cash you recovered",
    blurb:
      "A simple dashboard shows what's outstanding, what's been chased, and how much Forja has helped you collect.",
    bullets: ["Outstanding at a glance", "Reminder history", "Recovered total", "Weekly email recap"],
  },
];

export type Outcome = {
  client: string;
  problem: string;
  built: string;
  result: string;
};

// Honest use-case scenarios (NOT testimonials, NOT results claims). They describe how Forja works
// for a given kind of studio — no invented metrics. Replace/augment with real customer stories
// once we have them (see docs/STRATEGY.md, Phase 1).
export const outcomes: Outcome[] = [
  {
    client: "Design studio · 8 people",
    result: "Every overdue invoice chased, without anyone owning it",
    problem: "Two or three invoices slip past due each month and the follow-up keeps landing on the founder.",
    built: "Forja sends the gentle → firm → final sequence in the studio's name and stops the instant Stripe marks it paid.",
  },
  {
    client: "Branding agency",
    result: "Follow-ups that don't depend on remembering",
    problem: "Chasing clients feels awkward, so reminders get delayed or skipped and cash sits uncollected.",
    built: "Reminders go out automatically on a schedule you set, in your tone, with the pay link attached.",
  },
  {
    client: "Dev shop · consultancy",
    result: "Cash in the bank, minus the uncomfortable emails",
    problem: "Large invoices going 30+ days late turn into a real cash-flow problem, and nobody enjoys the chase.",
    built: "Forja runs the whole chase quietly in the background and shows the recovered total climbing on your dashboard.",
  },
];

// Why Forja, when Stripe can already remind. The page's most important section: it answers the
// one objection every Stripe user has ("don't I have this already?"). It must be ACCURATE — Stripe
// does send scheduled reminders; our edge is wording, sending in your name, the recovered-cash
// view, and zero per-invoice setup.
export const comparison = {
  heading: "More than Stripe's reminders.",
  intro:
    "Stripe can send scheduled reminders if you set them up per invoice — the same fixed wording, from a generic template, and behind its Billing Plus plan. Forja runs the whole chase in your studio's voice and shows you the cash it brings back.",
  stripeLabel: "Stripe's built-in reminders",
  forjaLabel: "Forja",
  rows: [
    { label: "Wording", stripe: "One fixed template, the same for every client", forja: "A gentle → firm → final sequence, in your own words" },
    { label: "Setup", stripe: "Configured invoice by invoice, on the Plus plan", forja: "Connect once — every overdue invoice is chased automatically" },
    { label: "Recovered cash", stripe: "No recovered-cash view", forja: "Outstanding · chased · recovered, in one dashboard" },
    { label: "Effort", stripe: "You set it up and keep an eye on it", forja: "Runs in the background while you work" },
    { label: "Stops when paid", stripe: "Yes", forja: "Yes, the instant Stripe marks it paid" },
  ],
};

export const process = [
  { n: "01", title: "Connect", text: "Add a read-only Stripe key. Forja imports your open invoices right away." },
  { n: "02", title: "Watch", text: "It tracks due dates and flags invoices the moment they slip past due." },
  { n: "03", title: "Chase", text: "Polite, escalating reminders go out on a schedule, each with the payment link." },
  { n: "04", title: "Get paid", text: "The sequence stops the instant Stripe marks the invoice paid. You watch the total climb." },
];

export type Pkg = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  summary: string;
  features: string[];
  action: "buy" | "quote";
  featured?: boolean;
};

export const packages: Pkg[] = [
  {
    id: "solo",
    name: "Solo",
    price: "€19",
    cadence: "per month",
    summary: "For one-person studios billing a handful of clients.",
    features: ["1 Stripe account", "Up to 25 tracked invoices", "The standard reminder sequence", "Recovered-cash dashboard"],
    action: "buy",
  },
  {
    id: "studio",
    name: "Studio",
    price: "€49",
    cadence: "per month",
    summary: "For studios and agencies that can't afford a dropped follow-up.",
    features: ["Everything in Solo", "Unlimited tracked invoices", "Custom reminder tone & timing", "Weekly email recap"],
    action: "buy",
    featured: true,
  },
  {
    id: "agency",
    name: "Agency",
    price: "€99",
    cadence: "per month",
    summary: "For teams billing across multiple Stripe accounts.",
    features: ["Everything in Studio", "Multiple Stripe accounts", "Branded sender domain", "Priority support"],
    action: "quote",
  },
];

export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  {
    q: "How is this different from Stripe's built-in reminders?",
    a: "Stripe can send scheduled reminders if you configure them per invoice, but they use one fixed template with no escalation, and they don't show you what you've recovered (and they sit on Stripe's Billing Plus plan). Forja runs a sequence that escalates in your own words, sends in your studio's name, and gives you a recovered-cash dashboard. Connect once and it just runs, then stops the moment an invoice is paid.",
  },
  {
    q: "Is my Stripe data safe?",
    a: "Forja only ever uses a read-only restricted key, and your key is encrypted before it's stored. We read your invoices to chase them, nothing more, and you can disconnect in one click.",
  },
  {
    q: "Will it email my clients without me knowing?",
    a: "You stay in control. You set the tone and schedule, can preview reminders, and Forja stops the moment an invoice is paid. Nothing goes out before you switch it on, and every reminder has Reply-To set to you, so replies reach you and never Forja.",
  },
  {
    q: "What if I don't use Stripe?",
    a: "For now Forja is built specifically for businesses that invoice through Stripe. Other tools are on the roadmap, so tell us what you use.",
  },
  {
    q: "How much does it cost?",
    a: "Plans start at €19/month with a 14-day free trial, no card to start. Most studios are on the €49 plan. If we recover a single late invoice, we've more than paid for ourselves.",
  },
];

export const nav = [
  { label: "Why Forja", href: "/#why" },
  { label: "Security", href: "/#security" },
  { label: "How it works", href: "/#process" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

export type SecurityPoint = { title: string; body: string };

export const security: { heading: string; intro: string; points: SecurityPoint[] } = {
  heading: "Built to be trusted with your Stripe.",
  intro:
    "Forja reads your invoices to chase them, nothing more. Here's exactly what it can and can't touch.",
  points: [
    {
      title: "Read-only, restricted access",
      body: "You connect a Stripe restricted key scoped to Invoices: Read. Forja can see overdue invoices — it can't move money, issue refunds, or change anything.",
    },
    {
      title: "Your key, encrypted at rest",
      body: "The key is encrypted before it is stored and used only to read invoices. Disconnect in one click and it's gone.",
    },
    {
      title: "It sends in your name",
      body: "Reminders go out as your studio, with Reply-To set to you, so client replies reach you and never Forja.",
    },
    {
      title: "Stops the moment it's paid",
      body: "Every invoice re-syncs from Stripe before a send; the instant it's marked paid, the chasing stops. Dry-run lets you watch first.",
    },
  ],
};

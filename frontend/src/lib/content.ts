// Single source of truth for all site copy + offerings.
// Forja is an AR-collections SaaS: it connects to a customer's Stripe (read-only) and
// auto-chases their overdue invoices. Copy avoids buzzwords, minimal em-dashes.

export const brand = {
  name: "Forja",
  meaning: "Portuguese for forge",
  tagline: "Get paid faster, without the awkward chasing.",
  intro:
    "Forja connects to your Stripe account and chases overdue invoices for you, with polite, automatic reminders until clients pay.",
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
    title: "Reminders that escalate, politely",
    blurb:
      "Forja sends on-brand emails on a smart schedule, firm but friendly, each with the Stripe payment link, until the invoice is paid.",
    bullets: ["Timed sequences", "Your tone, your sender", "Payment link included", "Stops once it's paid"],
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

// Illustrative examples. Replace with real customer results before scaling outreach.
export const outcomes: Outcome[] = [
  {
    client: "Freelance designer",
    problem: "Spent Friday afternoons writing awkward 'just checking in' emails about unpaid invoices.",
    built: "Forja now sends the follow-ups automatically, in her voice, with the pay link attached.",
    result: "Zero manual reminders, and invoices clear about a week sooner.",
  },
  {
    client: "Five-person dev studio",
    problem: "Two or three invoices a month quietly slipped 30+ days past due.",
    built: "Escalating reminders go out on schedule and stop the instant Stripe marks them paid.",
    result: "Late invoices down sharply, with no more dropped follow-ups.",
  },
  {
    client: "Marketing consultant",
    problem: "Never knew how much was actually outstanding at any given moment.",
    built: "One dashboard with outstanding, chased, and recovered totals, updated from Stripe.",
    result: "Full visibility, and cash in the bank faster.",
  },
];

// Why Forja, when Stripe can already send a reminder. This is the page's most important
// section: it answers the one objection every Stripe user has ("don't I have this already?").
export const comparison = {
  heading: "More than Stripe's built-in reminder.",
  intro:
    "Stripe can fire off a single fixed reminder if you set it up. Forja runs the whole chase for you, escalating and on-brand, with the cash you've recovered always in plain sight.",
  stripeLabel: "Stripe's built-in reminders",
  forjaLabel: "Forja",
  rows: [
    { label: "Cadence", stripe: "One fixed template", forja: "A gentle → firm → final sequence that escalates on its own" },
    { label: "Tone & branding", stripe: "Generic sender, generic wording", forja: "Your voice, your domain, the client's name" },
    { label: "Visibility", stripe: "No recovered-cash view", forja: "Outstanding · chased · recovered, in one dashboard" },
    { label: "Effort", stripe: "You configure it and keep watching", forja: "Connect once; Forja runs it while you work" },
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
    summary: "For freelancers who bill a handful of clients.",
    features: ["1 Stripe account", "Up to 25 tracked invoices", "The standard reminder sequence", "Recovered-cash dashboard"],
    action: "buy",
  },
  {
    id: "studio",
    name: "Studio",
    price: "€49",
    cadence: "per month",
    summary: "For small studios and agencies that can't afford a dropped follow-up.",
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

export type Testimonial = { quote: string; name: string; role: string };

// Illustrative. Replace with real quotes before launch.
export const testimonials: Testimonial[] = [
  {
    quote: "I used to dread chasing invoices. Now it just happens, and clients pay faster without me being the bad guy.",
    name: "Marta Reis",
    role: "Freelance designer",
  },
  {
    quote: "We stopped letting invoices slip through the cracks. The reminders are polite, on-brand, and relentless.",
    name: "Daniel Khoury",
    role: "Studio founder",
  },
];

export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  {
    q: "How is this different from Stripe's built-in reminders?",
    a: "Stripe can send a single, fixed reminder if you configure it. Forja runs the whole chase for you: a polite sequence that escalates over time, in your brand's voice, and a dashboard showing exactly how much it has recovered. You connect once and it just runs, then stops the moment an invoice is paid.",
  },
  {
    q: "Is my Stripe data safe?",
    a: "Forja only ever uses a read-only restricted key, and your key is encrypted before it's stored. We read your invoices to chase them, nothing more, and you can disconnect in one click.",
  },
  {
    q: "Will it email my clients without me knowing?",
    a: "You stay in control. You set the tone and schedule, can preview reminders, and Forja stops the moment an invoice is paid. Nothing goes out before you switch it on.",
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
  { label: "How it works", href: "/#process" },
  { label: "Security", href: "/#security" },
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

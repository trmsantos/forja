// Single source of truth for all site copy + offerings.
// Forja is an AR-collections SaaS: it connects to a customer's Stripe (read-only) and
// auto-chases their overdue invoices. Copy avoids buzzwords, minimal em-dashes.

export const brand = {
  name: "Forja",
  meaning: "Portuguese for forge",
  tagline: "Get paid faster, without the awkward chasing.",
  intro:
    "Forja connects to your Stripe account and automatically chases your overdue invoices with polite, well-timed reminders. You collect more, sooner, without lifting a finger. Built for freelancers and small studios that bill through Stripe.",
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
  { label: "How it works", href: "/#process" },
  { label: "Results", href: "/#work" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

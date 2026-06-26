// Single source of truth for all site copy + offerings.
// Copy is written to dodge Impeccable's "copy" slop rules: minimal em-dashes,
// no marketing buzzwords (streamline / supercharge / world-class), no aphoristic cadence.

export const brand = {
  name: "Forja",
  meaning: "Portuguese for forge",
  tagline: "AI, forged into products that work.",
  intro:
    "We design and build AI software, assistants, and automation for companies that want working products, not demos. A small senior team that ships fast and stays hands-on.",
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
    id: "software",
    title: "Custom AI software & SaaS",
    blurb:
      "We design and build AI products from first prototype to a product your customers pay for.",
    bullets: ["Product & UX design", "Full-stack build", "Models, evals & guardrails", "Deploy & iterate"],
  },
  {
    id: "assistants",
    title: "Chatbots & assistants",
    blurb:
      "Assistants grounded in your own data, useful on day one, and honest about what they don't know.",
    bullets: ["RAG over your docs", "Support & internal copilots", "Voice & chat", "Human handoff"],
  },
  {
    id: "automation",
    title: "AI automation",
    blurb:
      "We automate the manual work: the pipelines and agents that run your back office in the background.",
    bullets: ["Workflow & agent design", "Tool & API integration", "Monitoring", "Ongoing tuning"],
  },
];

export type Outcome = {
  client: string;
  problem: string;
  built: string;
  result: string;
};

// Illustrative case studies. Replace with real client work before launch.
export const outcomes: Outcome[] = [
  {
    client: "B2B SaaS, support team",
    problem: "Tickets piled up overnight and first replies took six hours.",
    built: "A support assistant grounded in their help center and past tickets, with human handoff.",
    result: "First response down to under five minutes; 60% of tickets resolved without an agent.",
  },
  {
    client: "Logistics firm, operations",
    problem: "Staff re-typed invoice data from PDFs into three systems by hand.",
    built: "An extraction and reconciliation pipeline that reads invoices and posts the data.",
    result: "Around 30 hours of manual entry removed every week, with an audit trail.",
  },
  {
    client: "Law office, research",
    problem: "Associates lost hours searching 12,000 internal documents.",
    built: "A research copilot that answers in plain language and cites the source document.",
    result: "Common questions answered in seconds, every answer linked to its source.",
  },
];

export const process = [
  { n: "01", title: "Scope", text: "A short, paid discovery. We map the problem, the data, and what 'done' means." },
  { n: "02", title: "Forge", text: "We build in the open, with weekly demos. You see it take shape, not a black box." },
  { n: "03", title: "Ship", text: "It goes live with evals and monitoring, so it keeps working after launch." },
  { n: "04", title: "Tend", text: "Optional retainer: we keep it sharp as your needs and the models change." },
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
    id: "audit",
    name: "AI Audit",
    price: "€1,900",
    cadence: "fixed scope",
    summary: "A two-week sprint to find where AI pays off in your business, and where it does not.",
    features: ["Opportunity map", "Feasibility & cost notes", "A working proof-of-concept", "Build recommendation"],
    action: "buy",
  },
  {
    id: "automation-starter",
    name: "Automation Starter",
    price: "€3,500",
    cadence: "fixed scope",
    summary: "We pick one painful manual process and automate it end to end, in production.",
    features: ["One workflow, fully built", "Integrated with your tools", "Monitoring dashboard", "30 days of tuning"],
    action: "buy",
    featured: true,
  },
  {
    id: "build",
    name: "Custom Build",
    price: "Let's scope it",
    cadence: "project or retainer",
    summary: "A full product or a standing partnership. We build the thing and stay to keep it sharp.",
    features: ["Dedicated build team", "Product + AI engineering", "Weekly demos", "Retainer option"],
    action: "quote",
  },
];

export type Testimonial = { quote: string; name: string; role: string };

// Illustrative. Replace with real quotes before launch.
export const testimonials: Testimonial[] = [
  {
    quote: "They shipped a working assistant in three weeks that our last vendor quoted six months for.",
    name: "Marta Reis",
    role: "COO, fintech",
  },
  {
    quote: "No jargon, no theater. Weekly demos meant we always knew exactly where things stood.",
    name: "Daniel Khoury",
    role: "Head of Ops, logistics",
  },
];

export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  {
    q: "How fast can we start?",
    a: "Most engagements begin within a week. The AI Audit and Automation Starter are fixed-scope, so we can kick off as soon as you buy.",
  },
  {
    q: "Who owns the code?",
    a: "You do. Everything we build is yours, in your repositories and your infrastructure, with no lock-in.",
  },
  {
    q: "What about our data?",
    a: "We work inside your accounts where possible and never train third-party models on your data. Data handling is agreed in writing before we start.",
  },
  {
    q: "We're not a technical team. Is that a problem?",
    a: "No. We translate between the business and the build, and the weekly demos are made to be understood by anyone.",
  },
];

export const nav = [
  { label: "Services", href: "/#services" },
  { label: "Work", href: "/#work" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Contact", href: "/#contact" },
];

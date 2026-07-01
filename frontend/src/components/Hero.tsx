import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

// A believable slice of the product — the strongest confidence signal for a tool that touches
// someone's Stripe + client relationships. Figures are illustrative marketing copy.
function InvoiceRow({ name, amount, chip, tone }: { name: string; amount: string; chip: string; tone: "ember" | "paid" | "queued" }) {
  const chipCls =
    tone === "ember" ? "bg-blush text-emberlit" : tone === "paid" ? "bg-mint text-ink" : "bg-steel text-slate";
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-ink">{name}</p>
        <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${chipCls}`}>{chip}</span>
      </div>
      <span className="font-mono text-[14px] font-semibold tabular-nums text-ink">{amount}</span>
    </li>
  );
}

function DashboardPreview() {
  return (
    <div className="card overflow-hidden shadow-lift">
      <div className="flex items-center gap-2 border-b border-line bg-steel px-4 py-3">
        <span className="flex gap-1.5" aria-hidden>
          <i className="h-2.5 w-2.5 rounded-full bg-line" />
          <i className="h-2.5 w-2.5 rounded-full bg-line" />
          <i className="h-2.5 w-2.5 rounded-full bg-line" />
        </span>
        <span className="ml-1 font-mono text-[12px] text-slate">forja / dashboard</span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-line">
        <div className="bg-paper p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate">Recovered · 30 days</p>
          <p className="mt-1.5 font-mono text-[26px] font-semibold tabular-nums text-ember">€4,820</p>
        </div>
        <div className="bg-paper p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate">Outstanding</p>
          <p className="mt-1.5 font-mono text-[26px] font-semibold tabular-nums text-ink">€7,240</p>
        </div>
      </div>

      <ul className="divide-y divide-line bg-paper">
        <InvoiceRow name="Marlow Studio" amount="€2,400" chip="Reminder 2 · sent" tone="ember" />
        <InvoiceRow name="Atlas & Co." amount="€1,180" chip="Paid" tone="paid" />
        <InvoiceRow name="Nadia Okonkwo" amount="€640" chip="Reminder 1 · queued" tone="queued" />
      </ul>

      <div className="flex items-center gap-2.5 border-t border-line bg-paper px-5 py-3.5 text-[13px] text-slate">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full rounded-full bg-ember opacity-70 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-ember" />
        </span>
        Chasing 6 open invoices — nothing for you to do.
      </div>
    </div>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  const rise = (i: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease: EASE, delay: 0.06 * i } };

  return (
    <section id="top" className="relative overflow-hidden bg-mist">
      {/* forge heat — a background glow, not a glass card */}
      <div aria-hidden className="pointer-events-none absolute -top-32 right-[-12%] h-[560px] w-[560px] rounded-full bg-ember/20 blur-[130px]" />

      <div className="shell relative grid items-center gap-14 pt-16 pb-20 sm:pt-24 sm:pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div className="max-w-2xl">
          <motion.h1 {...rise(0)} className="display text-[clamp(2.6rem,6vw,4.6rem)] text-ink">
            Get paid <span className="text-ember">weeks sooner</span>, without chasing anyone.
          </motion.h1>

          <motion.p {...rise(1)} className="prose-pretty mt-6 max-w-prose text-[19px] leading-relaxed text-slate">
            Connect Stripe with a read-only key. Forja chases your overdue invoices with polite, escalating
            reminders in your name — until the client pays, then it stops.
          </motion.p>

          <motion.div {...rise(2)} className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/signup" className="btn-ember">Start free</Link>
            <Link to="/audit" className="btn-ghost">Run a free audit</Link>
          </motion.div>

          <motion.ul {...rise(3)} className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-slate">
            {["Read-only Stripe key", "No card to start", "Stops the moment it’s paid"].map((t) => (
              <li key={t} className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-ember" aria-hidden /> {t}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          {...(reduce ? {} : { initial: { opacity: 0, y: 26 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, ease: EASE, delay: 0.16 } })}
          className="relative"
        >
          <DashboardPreview />
        </motion.div>
      </div>
    </section>
  );
}

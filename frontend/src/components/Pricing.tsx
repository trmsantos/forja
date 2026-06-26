import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { packages } from "../lib/content";
import { Reveal } from "./Reveal";

// Self-serve subscription pricing. "buy" tiers start a free trial via /signup; "quote" tiers route to contact.
export function Pricing() {
  return (
    <section id="pricing" className="bg-mist">
      <div className="shell py-24 sm:py-28">
        <Reveal>
          <h2 className="display text-[clamp(1.9rem,4.5vw,3.2rem)] text-ink">Simple pricing. It pays for itself.</h2>
          <p className="mt-5 max-w-prose text-[17px] leading-relaxed text-slate">
            Every plan starts with a 14-day free trial, no card to start. If Forja recovers a single
            late invoice, it has already paid for itself.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {packages.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ type: "spring", duration: 0.6, bounce: 0.18, delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              className={`flex flex-col rounded-3xl bg-paper p-8 ${p.featured ? "ring-2 ring-ember shadow-lift" : "border border-line"}`}
            >
              {p.featured && (
                <span className="mb-4 inline-flex w-fit rounded-full bg-ember px-3 py-1 text-[12px] font-semibold text-coal">
                  Where most teams start
                </span>
              )}
              <h3 className="font-display text-2xl font-bold tracking-tight2 text-ink">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-extrabold text-ink">{p.price}</span>
                <span className="text-[14px] text-slate">{p.cadence}</span>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-slate">{p.summary}</p>
              <ul className="mt-6 space-y-3 border-t border-line pt-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[15px] text-ink/75">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8 pt-2">
                {p.action === "buy" ? (
                  <Link to="/signup" className={`w-full ${p.featured ? "btn-ember" : "btn-ghost"}`}>
                    Start free
                  </Link>
                ) : (
                  <a href="#contact" className="w-full btn-ghost">
                    Talk to us
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

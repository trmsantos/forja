import { motion } from "framer-motion";
import { comparison } from "../lib/content";
import { Reveal } from "./Reveal";

// The "don't I already have this in Stripe?" objection-killer. Two columns: Stripe's basic
// reminder vs Forja, row by row, with the Forja column lifted in ember.
export function Comparison() {
  return (
    <section id="why" className="bg-mist">
      <div className="shell py-24 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <h2 className="display text-[clamp(1.9rem,4.5vw,3rem)] text-ink">{comparison.heading}</h2>
            <p className="mt-5 max-w-prose text-[17px] leading-relaxed text-slate">{comparison.intro}</p>
          </Reveal>

          <Reveal className="lg:col-span-7">
            <div className="overflow-hidden rounded-3xl border border-line">
              {/* header row */}
              <div className="grid grid-cols-[1fr_1fr] bg-steel/60 text-[13px] font-semibold uppercase tracking-wide text-slate">
                <div className="px-5 py-4">{comparison.stripeLabel}</div>
                <div className="px-5 py-4 text-ember">{comparison.forjaLabel}</div>
              </div>

              {comparison.rows.map((row, i) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: i * 0.06 }}
                  className="grid grid-cols-[1fr_1fr] border-t border-line"
                >
                  <div className="px-5 py-5">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-slate">{row.label}</p>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-slate">{row.stripe}</p>
                  </div>
                  <div className="bg-blush px-5 py-5">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-ember">{row.label}</p>
                    <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-ink">{row.forja}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

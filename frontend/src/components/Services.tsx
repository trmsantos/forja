import { motion } from "framer-motion";
import { services } from "../lib/content";
import { Reveal } from "./Reveal";

const TINTS = ["bg-blush", "bg-sky", "bg-mint"];

export function Services() {
  return (
    <section id="services" className="bg-paper">
      <div className="shell py-24 sm:py-28">
        <Reveal>
          <h2 className="display max-w-[16ch] text-[clamp(1.9rem,4.5vw,3.2rem)] text-ink">Everything it does, on autopilot.</h2>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {services.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ type: "spring", duration: 0.6, bounce: 0.18, delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              className={`${TINTS[i % TINTS.length]} flex flex-col rounded-3xl p-7`}
            >
              <span className="font-display text-2xl font-extrabold text-ember">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-4 font-display text-2xl font-bold tracking-tight2 text-ink">{s.title}</h3>
              <p className="mt-3 text-[16px] leading-relaxed text-ink/70">{s.blurb}</p>
              <ul className="mt-6 flex flex-col gap-2 border-t border-ink/10 pt-5">
                {s.bullets.map((b) => (
                  <li key={b} className="text-[14px] font-medium text-ink/65">
                    {b}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

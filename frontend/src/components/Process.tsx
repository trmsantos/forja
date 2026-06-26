import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { process } from "../lib/content";
import { Reveal } from "./Reveal";

// Scroll-linked progress line (smooth, no pinning) — the modern Framer feel.
export function Process() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 35%"] });
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="process" className="bg-paper">
      <div className="shell py-24 sm:py-28">
        <Reveal>
          <h2 className="display max-w-[20ch] text-[clamp(1.9rem,4.5vw,3.2rem)] text-ink">
            From overdue to paid, on its own.
          </h2>
        </Reveal>

        <div ref={ref} className="relative mt-16">
          <div className="absolute left-0 right-0 top-2 h-0.5 bg-line" />
          <motion.div style={{ scaleX }} className="absolute left-0 right-0 top-2 h-0.5 origin-left bg-ember" />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {process.map((p, i) => (
              <Reveal key={p.n} delay={i * 0.08}>
                <div className="pt-8">
                  <span className="absolute mt-[-2.1rem] block h-3 w-3 rounded-full border-2 border-paper bg-ember" />
                  <span className="font-display text-sm font-bold text-ember">{p.n}</span>
                  <h3 className="mt-2 font-display text-xl font-bold tracking-tight2 text-ink">{p.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

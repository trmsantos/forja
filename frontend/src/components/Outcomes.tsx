import { outcomes } from "../lib/content";
import { Reveal } from "./Reveal";

export function Outcomes() {
  return (
    <section id="work" className="bg-mist">
      <div className="shell py-24 sm:py-28">
        <Reveal>
          <h2 className="display max-w-[18ch] text-[clamp(1.9rem,4.5vw,3.2rem)] text-ink">How Forja works for teams like yours.</h2>
          <p className="mt-5 max-w-prose text-[17px] leading-relaxed text-slate">
            A few kinds of studio, and how Forja handles the chasing for each.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-3">
          {outcomes.map((o, i) => (
            <Reveal key={o.client} delay={i * 0.08} className="border-t border-line pt-6">
              <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-ember">{o.client}</p>
              <p className="mt-4 font-display text-[22px] font-bold leading-snug tracking-tight2 text-ink">{o.result}</p>
              <p className="prose-pretty mt-4 text-[14px] leading-relaxed text-slate">
                {o.problem} {o.built}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

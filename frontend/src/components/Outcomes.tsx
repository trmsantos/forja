import { outcomes } from "../lib/content";
import { Reveal } from "./Reveal";

export function Outcomes() {
  return (
    <section id="work" className="bg-mist">
      <div className="shell py-24 sm:py-28">
        <Reveal>
          <h2 className="display max-w-[18ch] text-[clamp(1.9rem,4.5vw,3.2rem)] text-ink">Less chasing. More collected.</h2>
          <p className="mt-5 max-w-prose text-[17px] leading-relaxed text-slate">
            A few of the ways Forja turns overdue invoices into paid ones.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {outcomes.map((o, i) => (
            <Reveal key={o.client} delay={i * 0.08}>
              <article className="card h-full p-7 shadow-soft">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-ember">{o.client}</p>
                <p className="mt-4 text-[15px] leading-relaxed text-slate">{o.problem}</p>
                <p className="mt-3 text-[15px] leading-relaxed text-ink">{o.built}</p>
                <p className="mt-6 border-t border-line pt-5 font-display text-lg font-bold leading-snug text-ink">
                  {o.result}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

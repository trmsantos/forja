import { services } from "../lib/content";
import { Reveal } from "./Reveal";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
// connect · chase · track
const ICONS = [
  <svg key="link" viewBox="0 0 24 24" width="20" height="20" {...S}><path d="M9 12h6" /><path d="M8 8H6a4 4 0 0 0 0 8h2" /><path d="M16 8h2a4 4 0 0 1 0 8h-2" /></svg>,
  <svg key="send" viewBox="0 0 24 24" width="20" height="20" {...S}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" /></svg>,
  <svg key="chart" viewBox="0 0 24 24" width="20" height="20" {...S}><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" /></svg>,
];

export function Services() {
  return (
    <section id="services" className="bg-paper">
      <div className="shell py-24 sm:py-28">
        <Reveal>
          <h2 className="display max-w-[16ch] text-[clamp(1.9rem,4.5vw,3.2rem)] text-ink">Everything it does, on autopilot.</h2>
        </Reveal>

        <div className="mt-14 grid gap-y-12 md:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.id} delay={i * 0.08} className="md:border-l md:border-line md:pl-10 md:first:border-l-0 md:first:pl-0">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blush text-ember">{ICONS[i]}</span>
              <h3 className="mt-5 font-display text-xl font-bold tracking-tight2 text-ink">{s.title}</h3>
              <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-slate">{s.blurb}</p>
              <ul className="mt-5 space-y-2">
                {s.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-[14px] text-slate">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-ember/70" aria-hidden /> {b}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

import { faqs } from "../lib/content";
import { Reveal } from "./Reveal";

export function Faq() {
  return (
    <section id="faq" className="bg-paper">
      <div className="shell py-24 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <h2 className="display text-[clamp(1.9rem,4.5vw,3rem)] text-ink">Questions, answered.</h2>
          </Reveal>
          <Reveal className="lg:col-span-8">
            <dl className="border-t border-line">
              {faqs.map((f) => (
                <details key={f.q} className="group border-b border-line py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <dt className="font-display text-lg font-bold text-ink">{f.q}</dt>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mist text-ember transition-transform duration-200 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <dd className="mt-3 max-w-prose text-[16px] leading-relaxed text-slate">{f.a}</dd>
                </details>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

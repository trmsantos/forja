import { testimonials } from "../lib/content";
import { Reveal } from "./Reveal";

export function Testimonials() {
  return (
    <section className="bg-ink">
      <div className="shell py-24 sm:py-28">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1}>
              <figure>
                <blockquote className="font-display text-[26px] font-bold leading-tight tracking-tight2 text-paper sm:text-[30px]">
                  <span className="text-ember">&ldquo;</span>
                  {t.quote}
                  <span className="text-ember">&rdquo;</span>
                </blockquote>
                <figcaption className="mt-6 text-[15px] text-paper/60">
                  <span className="font-semibold text-paper">{t.name}</span> · {t.role}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

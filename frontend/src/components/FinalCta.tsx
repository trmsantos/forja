import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";

// The closing ask — an ember "drench" (brand permission), confident and singular.
export function FinalCta() {
  return (
    <section className="bg-mist">
      <div className="shell pb-24 sm:pb-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-ember px-8 py-16 text-coal sm:px-14 sm:py-20">
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-emberlit/40 blur-3xl" />
            <div className="relative max-w-2xl">
              <h2 className="display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.03]">Stop chasing. Start collecting.</h2>
              <p className="mt-5 max-w-prose text-[18px] leading-relaxed text-coal/80">
                Connect Stripe read-only and let Forja chase your overdue invoices for you — polite, in your name,
                until they're paid.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link to="/signup" className="btn bg-coal text-ink hover:bg-coal/90">Start free</Link>
                <Link to="/audit" className="btn border border-coal/25 text-coal hover:border-coal/50">Run a free audit</Link>
              </div>
              <p className="mt-6 text-[13px] font-medium text-coal/70">14-day trial · no card to start · cancel anytime</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

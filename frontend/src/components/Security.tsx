import { security } from "../lib/content";
import { Reveal } from "./Reveal";

// Small stroked glyphs (ember via currentColor). One per trust point.
const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ICONS = [
  // read-only (eye)
  <svg key="eye" viewBox="0 0 24 24" width="18" height="18" {...S}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>,
  // encrypted (lock)
  <svg key="lock" viewBox="0 0 24 24" width="18" height="18" {...S}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
  // sends in your name (reply)
  <svg key="reply" viewBox="0 0 24 24" width="18" height="18" {...S}><path d="M9 17l-5-5 5-5" /><path d="M4 12h11a5 5 0 0 1 5 5v2" /></svg>,
  // stops when paid (check)
  <svg key="check" viewBox="0 0 24 24" width="18" height="18" {...S}><path d="M20 6 9 17l-5-5" /></svg>,
];

function KeyCard() {
  const scopes: [string, string, boolean][] = [
    ["Invoices", "Read", true],
    ["Payments & payouts", "None", false],
    ["Customers", "None", false],
    ["Everything else", "None", false],
  ];
  return (
    <div className="mt-9 max-w-sm overflow-hidden rounded-2xl border border-line bg-steel shadow-soft">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
        <svg viewBox="0 0 24 24" width="16" height="16" className="text-ember" {...S}>
          <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        <code className="font-mono text-[13px] text-slate">rk_live_51H••••••••••</code>
        <span className="ml-auto rounded-full bg-mint px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">restricted</span>
      </div>
      <dl className="divide-y divide-line/70">
        {scopes.map(([label, value, granted]) => (
          <div key={label} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
            <dt className="text-slate">{label}</dt>
            <dd className={granted ? "font-mono font-semibold text-ember" : "font-mono text-slate/70"}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function Security() {
  return (
    <section id="security" className="bg-mist">
      <div className="shell py-24 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
          <Reveal className="lg:col-span-5">
            <h2 className="display text-[clamp(1.9rem,4.5vw,3rem)] text-ink">{security.heading}</h2>
            <p className="prose-pretty mt-5 max-w-prose text-[17px] leading-relaxed text-slate">{security.intro}</p>
            <KeyCard />
          </Reveal>

          <Reveal className="lg:col-span-7">
            <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-paper">
              {security.points.map((p, i) => (
                <li key={p.title} className="flex gap-4 px-6 py-6">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blush text-ember">{ICONS[i]}</span>
                  <div>
                    <h3 className="text-[16px] font-semibold text-ink">{p.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-slate">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

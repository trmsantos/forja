// Temporary review page for the redesign's logo exploration. Open /logo-lab on the preview
// deploy to compare marks, then the chosen one replaces components/Logo.tsx and this page is removed.

import { AnvilMark, StampMark, ForgedFMark } from "../components/logo-concepts";
import { LogoMark as CurrentMark } from "../components/Logo";

type Mark = { key: string; name: string; note: string; Comp: (p: { size?: number }) => JSX.Element };

const CONCEPTS: Mark[] = [
  { key: "anvil", name: "A · Anvil", note: "The forge's own tool, struck with a spark. Most ownable — not a flame, not a boxed F.", Comp: AnvilMark },
  { key: "stamp", name: "B · Struck stamp", note: "The F impressed into hot metal (maker's mark) with a molten spark in the counter.", Comp: StampMark },
  { key: "forgedF", name: "C · Forged F", note: "The letter kept but hot-worked: chamfered cuts + a molten tip on the top arm.", Comp: ForgedFMark },
  { key: "current", name: "Current (for comparison)", note: "The geometric-F-in-a-rounded-square — the cliché we're replacing.", Comp: CurrentMark },
];

function Wordmark({ Comp }: { Comp: Mark["Comp"] }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-ink">
      <Comp size={34} />
      <span className="font-display font-extrabold tracking-tight2" style={{ fontSize: 26, lineHeight: 1 }}>
        Forja
      </span>
    </span>
  );
}

export function LogoLab() {
  return (
    <section className="bg-mist min-h-screen">
      <div className="shell py-16">
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-ember">Redesign · logo lab</p>
        <h1 className="display mt-3 text-3xl text-ink">Pick a direction</h1>
        <p className="mt-3 max-w-prose text-[15px] text-slate">
          Reply with the letter you like (A / B / C), or say what to push further. I'll finalize the winner
          across the app (nav, favicon, hero) and remove this page.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {CONCEPTS.map(({ key, name, note, Comp }) => (
            <div key={key} className="card p-7 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-ink">{name}</h2>
                <span className="font-mono text-[11px] text-slate">48px grid</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate">{note}</p>

              {/* large mark on the two canvas tones */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="grid h-28 place-items-center rounded-xl bg-mist text-ink">
                  <Comp size={64} />
                </div>
                <div className="grid h-28 place-items-center rounded-xl bg-paper text-ink">
                  <Comp size={64} />
                </div>
              </div>

              {/* wordmark lockup + small sizes (favicon test) */}
              <div className="mt-4 flex flex-wrap items-center gap-6 rounded-xl bg-steel px-4 py-3">
                <Wordmark Comp={Comp} />
                <span className="inline-flex items-center gap-3 text-ink">
                  <Comp size={24} />
                  <Comp size={16} />
                </span>
              </div>

              {/* on ember (inverse) */}
              <div className="mt-3 grid h-16 place-items-center rounded-xl bg-ember text-coal">
                <Comp size={28} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

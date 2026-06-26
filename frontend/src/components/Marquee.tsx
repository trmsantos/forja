const SEQ = ["Fintech", "Logistics", "Healthtech", "Legal", "Operations", "Support", "Research"];

// Industrial signage tickertape. CSS-animated (pauses on prefers-reduced-motion).
export function Marquee() {
  const half = SEQ.map((t, i) => (
    <span key={i} className="flex items-center font-mono text-[13px] uppercase tracking-[0.2em] text-bonedim">
      {t}
      <span className="mx-8 text-ember">/</span>
    </span>
  ));
  return (
    <div className="overflow-hidden border-y border-bone/12 bg-iron2 py-4">
      <div className="marquee-track flex w-max">
        {half}
        {half}
      </div>
    </div>
  );
}

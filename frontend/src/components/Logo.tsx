// Forja maker's mark — a "forged F": the letter hot-worked with chamfered cut terminals and a
// molten (ember) tip on the top arm, so it reads as struck metal rather than a flat geometric F.

// Molten tip tracks the theme's accent (resolves the same CSS variable Tailwind's `ember` uses;
// the variable holds RGB channels, so wrap in rgb()).
const EMBER = "rgb(var(--color-ember))";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* stem with chamfered foot */}
      <path d="M15 8 h6 v29 l-3 3 -3 -3 z" fill="currentColor" />
      {/* mid arm, chamfered end */}
      <path d="M21 20 h9 l-3 3 h-6 z" fill="currentColor" />
      {/* top arm */}
      <path d="M21 8 h13 l-4 4 h-9 z" fill="currentColor" />
      {/* molten tip */}
      <path d="M34 8 l3 -2.5 v9 l-3 -2.5 z" fill={EMBER} />
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none text-ink">
      <LogoMark size={size} />
      <span className="font-display font-extrabold tracking-tight2 text-ink" style={{ fontSize: size * 0.74, lineHeight: 1 }}>
        Forja
      </span>
    </span>
  );
}

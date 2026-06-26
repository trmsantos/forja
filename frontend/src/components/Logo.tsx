// Forja maker's-mark for the light theme: dark stamp tile, paper "F", ember spark.

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="13" fill="#16171b" />
      <rect x="16" y="12" width="6" height="24" rx="1.5" fill="#ffffff" />
      <rect x="16" y="12" width="15" height="6" rx="1.5" fill="#ffffff" />
      <rect x="16" y="21.5" width="11" height="6" rx="1.5" fill="#ffffff" />
      <rect x="30" y="21.5" width="5" height="5" rx="1.5" fill="#f1531c" />
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <LogoMark size={size} />
      <span className="font-display font-extrabold tracking-tight2 text-ink" style={{ fontSize: size * 0.74, lineHeight: 1 }}>
        Forja
      </span>
    </span>
  );
}

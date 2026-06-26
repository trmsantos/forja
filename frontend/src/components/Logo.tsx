// Forja maker's-mark for the dark theme: lifted stamp tile with an ember stroke, light "F", ember spark.

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="3" width="42" height="42" rx="12.5" fill="#1a1d24" stroke="#f1531c" strokeWidth="2" />
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

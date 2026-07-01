// Logo concept explorations for the redesign — reviewed live on /logo-lab, then the winner
// replaces components/Logo.tsx. Moving off the generic "geometric F in a rounded square".
//
// All marks: 48x48 viewBox, currentColor-friendly, ember accent (#f1531c) for the "heat".

const EMBER = "#f1531c";

// A) Anvil — the forge's own tool (underused vs flames), struck with a spark. Most ownable.
export function AnvilMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* strike spark */}
      <path d="M24 4.5 l1.4 4 4 1.4 -4 1.4 -1.4 4 -1.4-4 -4-1.4 4-1.4 z" fill={EMBER} />
      {/* anvil beam + horn */}
      <path
        d="M9 18 h22 l9 3.6 -9 3.6 h-22 a2.6 2.6 0 0 1 0 -7.2 z"
        fill="currentColor"
      />
      {/* waist + flared base */}
      <path d="M19.5 25 h9 v4.5 h4 l3.5 8.5 h-25 l3.5 -8.5 h4 z" fill="currentColor" />
    </svg>
  );
}

// B) Struck stamp — a forged maker's mark: the F impressed (knocked out) into hot metal,
// with a molten spark caught in the counter. Keeps the "F" but reframes it as a stamp.
export function StampMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M12 4 h24 a8 8 0 0 1 8 8 v24 a8 8 0 0 1 -8 8 h-24 a8 8 0 0 1 -8 -8 v-24 a8 8 0 0 1 8 -8 z
           M18 13 h15 v5 h-10 v4 h8 v5 h-8 v8 h-5 z"
      />
      {/* molten spark in the lower counter */}
      <rect x="25" y="27" width="4.5" height="4.5" rx="1.2" fill={EMBER} />
    </svg>
  );
}

// C) Forged F — the letter kept, but hot-worked: chamfered cut terminals and a molten tip on
// the top arm (glowing ember), so it reads as struck metal rather than a flat geometric F.
export function ForgedFMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* stem with chamfered foot */}
      <path d="M15 8 h6 v29 l-3 3 -3 -3 z" fill="currentColor" />
      {/* mid arm, chamfered end */}
      <path d="M21 20 h9 l-3 3 h-6 z" fill="currentColor" />
      {/* top arm with molten tip */}
      <path d="M21 8 h13 l-4 4 h-9 z" fill="currentColor" />
      <path d="M34 8 l3 -2.5 v9 l-3 -2.5 z" fill={EMBER} />
    </svg>
  );
}

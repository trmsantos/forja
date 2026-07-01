// Profile photo with a typographic fallback. Shows the uploaded image when present, otherwise
// the person's initials on a warm steel disc — never a broken image or an empty circle.

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  src,
  size = 40,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  const dim = { width: size, height: size };
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        style={dim}
        className="rounded-full object-cover ring-1 ring-line"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ ...dim, fontSize: size * 0.4 }}
      className="grid place-items-center rounded-full bg-steel font-display font-bold text-ember ring-1 ring-line"
    >
      {initials(name)}
    </span>
  );
}

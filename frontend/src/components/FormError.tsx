// Calm inline form error. Replaces the old uppercase-mono-ember treatment (which read like a
// terminal alarm) with a human, on-brand correction: a small alert icon + a legible message.

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="flex items-start gap-2 text-[14px] leading-snug text-emberlit" role="alert">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 shrink-0"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      {message}
    </p>
  );
}

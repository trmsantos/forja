// Shared money formatter so amounts read identically across the dashboard and the audit.
// Amounts arrive in cents from the backend.
export function money(amount?: number | null, currency?: string | null): string {
  if (amount == null) return "—";
  const cur = (currency || "eur").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${cur}`;
  }
}

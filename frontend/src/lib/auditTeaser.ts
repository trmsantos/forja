// Carries the free-audit "aha" (how much is overdue) from the public audit into signup and the
// first connect step, so the momentum survives the handoff instead of dead-ending at a generic form.
//
// SECURITY: this only ever holds AGGREGATE NUMBERS — never the Stripe key and never customer
// names/emails. The audit is stateless by design (the key is read in memory and never stored);
// that guarantee is preserved here. Uses sessionStorage so it evaporates when the tab closes.

const KEY = "forja_audit_teaser";
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours — a stale teaser shouldn't personalize a later visit

export type AuditTeaser = {
  overdueAmount: number; // cents
  overdueCount: number;
  currency: string;
  ts: number;
};

export function setAuditTeaser(t: Omit<AuditTeaser, "ts">): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...t, ts: Date.now() }));
  } catch {
    /* storage unavailable (private mode / disabled) — personalization is best-effort */
  }
}

export function getAuditTeaser(): AuditTeaser | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as AuditTeaser;
    if (!t || typeof t.overdueAmount !== "number" || t.overdueAmount <= 0) return null;
    if (Date.now() - t.ts > MAX_AGE_MS) {
      clearAuditTeaser();
      return null;
    }
    return t;
  } catch {
    return null;
  }
}

export function clearAuditTeaser(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}

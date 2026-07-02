import { useState } from "react";
import { Link } from "react-router-dom";
import { runAudit, type AuditSummary } from "../lib/api";
import { money } from "../lib/format";
import { setAuditTeaser } from "../lib/auditTeaser";
import { FormError } from "../components/FormError";

function AuditStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-6 shadow-soft">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-slate">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${accent ? "text-ember" : "text-ink"}`}>{value}</p>
    </div>
  );
}

export function Audit() {
  const [apiKey, setApiKey] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditSummary | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const summary = await runAudit(apiKey.trim(), email.trim() || undefined);
      setResult(summary);
      // Carry the "you have €X overdue" moment into signup + the first connect step.
      // Numbers only — never the key (the audit stays stateless).
      if (summary.overdue_amount > 0) {
        setAuditTeaser({
          overdueAmount: summary.overdue_amount,
          overdueCount: summary.overdue_count,
          currency: summary.currency,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run the audit");
    } finally {
      setBusy(false);
    }
  }

  const oldest = result?.oldest_overdue ?? null;

  return (
    <section className="bg-mist">
      <div className="shell py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-ember">Free · no signup</p>
          <h1 className="display mt-3 text-[clamp(2rem,5vw,3.4rem)] text-ink">
            See what Stripe isn&rsquo;t chasing.
          </h1>
          <p className="mt-5 text-[18px] leading-relaxed text-slate">
            Paste a read-only Stripe key and Forja reads your invoices on the spot: how much is outstanding,
            how many are overdue, and the one that&rsquo;s been waiting longest. Stripe reminds with one fixed
            template; Forja runs the whole chase in your voice and shows the cash you&rsquo;ve recovered.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          {/* The form */}
          <div className="card p-7 shadow-soft sm:p-8">
            <h2 className="font-display text-xl font-bold text-ink">Run your free audit</h2>
            <form onSubmit={onSubmit} className="mt-5 grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-[13px] font-medium text-slate">Stripe restricted key (read-only)</span>
                <input
                  type="password"
                  required
                  placeholder="rk_live_… or rk_test_…"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="field"
                  autoComplete="off"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[13px] font-medium text-slate">Email (optional, to send your results)</span>
                <input
                  type="email"
                  placeholder="you@studio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field"
                  autoComplete="email"
                />
              </label>
              <button type="submit" disabled={busy} className="btn-ember disabled:opacity-60">
                {busy ? "Auditing…" : "Run my free audit"}
              </button>
              <FormError message={error} />
            </form>

            <div className="mt-6 rounded-xl border border-line bg-paper p-4">
              <p className="text-[13px] leading-relaxed text-slate">
                <span className="font-semibold text-ink">We never store your key or your invoices.</span> This runs once,
                in memory, read-only. Create a key in{" "}
                <a
                  href="https://dashboard.stripe.com/apikeys/create"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-ember hover:underline"
                >
                  Stripe → Create restricted key
                </a>{" "}
                with <span className="font-medium text-ink">Invoices: Read</span>. A test-mode key works too.
              </p>
            </div>
          </div>

          {/* The results */}
          <div>
            {result === null ? (
              <div className="card flex min-h-[260px] flex-col items-center justify-center p-8 text-center shadow-soft">
                <p className="max-w-sm text-[15px] leading-relaxed text-slate">
                  Your summary appears here in seconds: outstanding total, overdue count, overdue amount,
                  and your oldest unpaid invoice.
                </p>
              </div>
            ) : (
              <div className="grid gap-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <AuditStat label="Outstanding" value={money(result.outstanding_amount, result.currency)} />
                  <AuditStat label="Overdue amount" value={money(result.overdue_amount, result.currency)} accent />
                  <AuditStat label="Overdue invoices" value={String(result.overdue_count)} />
                  <AuditStat label="Open invoices" value={String(result.outstanding_count)} />
                </div>

                <div className="card p-6 shadow-soft">
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-slate">Oldest overdue invoice</p>
                  {oldest ? (
                    <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[15px] font-semibold text-ink">{oldest.customer_name || "A client"}</span>
                      <span className="font-mono text-[15px] font-semibold tabular-nums text-ink">
                        {money(oldest.amount_due, oldest.currency)}
                      </span>
                      <span className="w-full text-[13px] text-slate">
                        {oldest.days_overdue} day{oldest.days_overdue === 1 ? "" : "s"} overdue · due{" "}
                        {new Date(oldest.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-3 text-[15px] leading-relaxed text-slate">
                      Nothing overdue right now — you&rsquo;re on top of it. Forja keeps it that way as new invoices slip past due.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-ember/40 bg-blush p-6 shadow-soft">
                  <h3 className="font-display text-lg font-bold text-ink">
                    {oldest ? "Let Forja chase these for you." : "Stay ahead of the next one."}
                  </h3>
                  <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-slate">
                    Connect once and Forja sends polite, escalating reminders until each invoice is paid, then stops —
                    with the recovered total always in plain sight.
                  </p>
                  <Link to="/signup" className="btn-ember mt-4 inline-flex">
                    {oldest ? `Start recovering ${money(result.overdue_amount, result.currency)} →` : "Create your account →"}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

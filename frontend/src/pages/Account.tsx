import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { getDashboard, connectStripe, billingPortal, resendVerification, type Dashboard } from "../lib/api";

function money(amount?: number | null, currency?: string | null): string {
  if (amount == null) return "—";
  const cur = (currency || "eur").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${cur}`;
  }
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blush text-emberdeep",
  paid: "bg-mint text-ink",
  void: "bg-mist text-slate",
  uncollectible: "bg-mist text-slate",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold capitalize ${STATUS_STYLES[status] || "bg-mist text-slate"}`}>
      {status}
    </span>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-6 shadow-soft">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-slate">{label}</p>
      <p className={`mt-2 font-display text-3xl font-extrabold ${accent ? "text-ember" : "text-ink"}`}>{value}</p>
    </div>
  );
}

export function Account() {
  const { user, loading, logout } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [errored, setErrored] = useState(false);
  const [resent, setResent] = useState<"idle" | "sending" | "sent">("idle");
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectErr, setConnectErr] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  function load() {
    getDashboard()
      .then((d) => {
        setData(d);
        setErrored(false);
      })
      .catch(() => setErrored(true));
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function resend() {
    setResent("sending");
    try {
      await resendVerification();
      setResent("sent");
    } catch {
      setResent("idle");
    }
  }

  async function onConnect(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setConnectErr(null);
    try {
      await connectStripe(apiKey.trim());
      setApiKey("");
      load();
    } catch (err) {
      setConnectErr(err instanceof Error ? err.message : "Could not connect your Stripe account");
    } finally {
      setConnecting(false);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const { url } = await billingPortal();
      window.location.href = url;
    } catch {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="bg-mist">
        <div className="shell flex min-h-[60vh] items-center justify-center text-slate">Loading…</div>
      </section>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const currency = data?.invoices[0]?.currency ?? "eur";

  const connectForm = (compact: boolean) => (
    <form onSubmit={onConnect} className="grid gap-3">
      <input
        type="password"
        required
        placeholder="Stripe restricted key (rk_…)"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        className="field"
        autoComplete="off"
      />
      <button type="submit" disabled={connecting} className={`${compact ? "btn-ghost" : "btn-ember"} disabled:opacity-60`}>
        {connecting ? "Connecting…" : compact ? "Update key & re-sync" : "Connect Stripe"}
      </button>
      {connectErr && <p className="text-[14px] text-emberdeep">{connectErr}</p>}
    </form>
  );

  return (
    <section className="bg-mist">
      <div className="shell py-16 sm:py-20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display text-[clamp(2rem,6vw,3.2rem)] text-ink">Hi, {user.name.split(" ")[0]}.</h1>
            <p className="mt-2 text-[15px] text-slate">{user.email}</p>
          </div>
          <button onClick={logout} className="btn-ghost !px-5 !py-2.5 text-[14px]">
            Log out
          </button>
        </div>

        {!user.email_verified && (
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-ember/40 bg-blush p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] text-ink">Please confirm your email. We sent a link when you signed up.</p>
            {resent === "sent" ? (
              <span className="text-[14px] font-semibold text-emberdeep">Sent — check your inbox.</span>
            ) : (
              <button onClick={resend} disabled={resent === "sending"} className="btn-ember !px-5 !py-2.5 text-[14px] disabled:opacity-60">
                {resent === "sending" ? "Sending…" : "Resend email"}
              </button>
            )}
          </div>
        )}

        {data === null ? (
          <p className="mt-10 text-[15px] text-slate">
            {errored ? "Could not load your dashboard. Refresh to try again." : "Loading…"}
          </p>
        ) : !data.connected ? (
          <div className="mt-8 card p-7 shadow-soft sm:p-9">
            <h2 className="font-display text-2xl font-bold text-ink">Connect your Stripe account</h2>
            <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-slate">
              Paste a <span className="font-medium text-ink">read-only restricted key</span> with access to Invoices.
              Forja imports your open invoices and starts chasing the ones past due. Your key is encrypted, and you can
              disconnect anytime.
            </p>
            <div className="mt-6 max-w-md">{connectForm(false)}</div>
            <p className="mt-4 text-[13px] leading-relaxed text-slate">
              Create one in Stripe under Developers → API keys → Create restricted key, with Invoices set to Read.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Outstanding" value={money(data.totals.outstanding_amount, currency)} />
              <Stat label="Recovered" value={money(data.totals.recovered_amount, currency)} accent />
              <Stat label="Open invoices" value={String(data.totals.open_count)} />
              <Stat label="Reminders sent" value={String(data.totals.reminders_sent)} />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-paper p-5">
              <div className="text-[14px] text-slate">
                Plan:{" "}
                <span className="font-semibold capitalize text-ink">
                  {data.subscription_status === "none" ? "Free trial" : data.subscription_status}
                </span>
                {data.last_synced_at && <> · Last synced {new Date(data.last_synced_at).toLocaleString()}</>}
              </div>
              {data.subscription_status !== "none" && (
                <button onClick={openPortal} disabled={portalLoading} className="btn-ghost !px-5 !py-2.5 text-[14px] disabled:opacity-60">
                  {portalLoading ? "Opening…" : "Manage billing"}
                </button>
              )}
            </div>

            <div className="mt-5 card p-7 shadow-soft">
              <h2 className="font-display text-xl font-bold text-ink">Tracked invoices</h2>
              {data.invoices.length === 0 ? (
                <p className="mt-4 text-[15px] leading-relaxed text-slate">
                  No open invoices right now. When something goes past due in Stripe, it shows up here and Forja starts chasing.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-line">
                  {data.invoices.map((inv) => (
                    <li key={inv.stripe_invoice_id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[15px] font-semibold text-ink">
                            {inv.customer_name || inv.customer_email || "Unknown customer"}
                          </span>
                          <StatusBadge status={inv.status} />
                        </div>
                        <p className="mt-1 text-[13px] text-slate">
                          {inv.due_date ? `Due ${new Date(inv.due_date).toLocaleDateString()}` : "No due date"}
                          {inv.reminder_step > 0 && <> · {inv.reminder_step} reminder{inv.reminder_step > 1 ? "s" : ""} sent</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-display text-lg font-bold text-ink">{money(inv.amount_due, inv.currency)}</span>
                        {inv.hosted_invoice_url && (
                          <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-[14px] font-medium text-ember hover:underline">
                            View
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <details className="mt-6 border-t border-line pt-5">
                <summary className="cursor-pointer text-[14px] font-medium text-slate hover:text-ink">
                  Update Stripe key or re-sync
                </summary>
                <div className="mt-4 max-w-md">{connectForm(true)}</div>
              </details>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

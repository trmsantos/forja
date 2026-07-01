import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { getDashboard, connectStripe, billingPortal, runCollections, resendVerification, startSubscription, type Dashboard, type PlanId } from "../lib/api";
import { money } from "../lib/format";

const PLANS: { id: PlanId; name: string; price: string }[] = [
  { id: "solo", name: "Solo", price: "€19" },
  { id: "studio", name: "Studio", price: "€49" },
  { id: "agency", name: "Agency", price: "€99" },
];

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blush text-emberlit",
  paid: "bg-mint text-ink",
  void: "bg-steel text-slate",
  uncollectible: "bg-steel text-slate",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold capitalize ${STATUS_STYLES[status] || "bg-steel text-slate"}`}>
      {status}
    </span>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-6 shadow-soft">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-slate">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${accent ? "text-ember" : "text-ink"}`}>{value}</p>
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
  const [chasing, setChasing] = useState(false);
  const [subscribing, setSubscribing] = useState<PlanId | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  // Feedback after returning from Stripe Checkout, then clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sub = params.get("subscription");
    if (sub === "success") showToast("Trial started — chasing is now switched on.");
    else if (sub === "cancelled") showToast("Checkout cancelled. You can start the trial anytime.");
    if (sub) window.history.replaceState({}, "", "/account");
  }, []);

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

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 5000);
  }

  async function subscribe(plan: PlanId) {
    setSubscribing(plan);
    try {
      const { url, message } = await startSubscription(plan);
      if (url) window.location.href = url;
      else if (message) showToast(message);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not start your subscription.");
    } finally {
      setSubscribing(null);
    }
  }

  async function runChase() {
    setChasing(true);
    try {
      const r = await runCollections();
      const verb = r.dry_run ? "would be sent (dry run)" : "sent";
      showToast(`${r.reminders} reminder${r.reminders === 1 ? "" : "s"} ${verb}, ${r.skipped} skipped`);
      load(); // refresh stats + reminder counts
    } catch {
      showToast("Could not run the chase. Try again.");
    } finally {
      setChasing(false);
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
  const planActive = data?.subscription_status === "active" || data?.subscription_status === "trialing";

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
      {connectErr && <p className="text-[14px] text-emberlit">{connectErr}</p>}
    </form>
  );

  return (
    <section className="bg-mist">
      <div className="shell py-16 sm:py-20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display text-3xl sm:text-4xl text-ink">Hi, {user.name.split(" ")[0]}.</h1>
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
              <span className="text-[14px] font-semibold text-emberlit">Sent — check your inbox.</span>
            ) : (
              <button onClick={resend} disabled={resent === "sending"} className="btn-ember !px-5 !py-2.5 text-[14px] disabled:opacity-60">
                {resent === "sending" ? "Sending…" : "Resend email"}
              </button>
            )}
          </div>
        )}

        {data === null ? (
          errored ? (
            <p className="mt-10 text-[15px] text-slate">Could not load your dashboard. Refresh to try again.</p>
          ) : (
            <div className="mt-8" role="status" aria-live="polite">
              <span className="sr-only">Loading your dashboard…</span>
              <div className="animate-pulse" aria-hidden>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="card p-6">
                      <div className="h-3 w-20 rounded bg-steel" />
                      <div className="mt-3 h-7 w-24 rounded bg-steel" />
                    </div>
                  ))}
                </div>
                <div className="card mt-5 p-7">
                  <div className="h-5 w-40 rounded bg-steel" />
                  <div className="mt-5 space-y-4">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="h-4 w-48 rounded bg-steel" />
                        <div className="h-4 w-16 rounded bg-steel" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : !data.connected ? (
          <div className="mt-8 card p-7 shadow-soft sm:p-9">
            <h2 className="font-display text-2xl font-bold text-ink">Connect your Stripe account</h2>
            <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-slate">
              Forja reads your open invoices with a <span className="font-medium text-ink">read-only restricted key</span>{" "}
              and starts chasing the ones past due. Your key is encrypted, and you can disconnect anytime.
            </p>

            <ol className="mt-6 grid gap-3 max-w-prose">
              {[
                <>
                  Open{" "}
                  <a
                    href="https://dashboard.stripe.com/apikeys/create"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-ember hover:underline"
                  >
                    Stripe → Create restricted key
                  </a>{" "}
                  (Developers → API keys).
                </>,
                <>
                  Set <span className="font-medium text-ink">Invoices</span> to{" "}
                  <span className="font-medium text-ink">Read</span>, leave everything else as None, then create the key.
                </>,
                <>
                  Copy the <span className="font-mono text-ink">rk_…</span> value and paste it below.
                </>,
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-slate">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-steel text-[12px] font-semibold text-ember">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-6 max-w-md">{connectForm(false)}</div>
            <p className="mt-4 text-[13px] leading-relaxed text-slate">
              Tip: a key in <span className="font-medium text-ink">test mode</span> lets you try Forja safely before going live.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {/* Recovered is the whole point of Forja — make it the hero metric, not one of four equals. */}
              <div className="card flex flex-col justify-center p-7 shadow-soft">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-slate">Recovered</p>
                <p className="mt-2 font-mono text-[40px] font-semibold leading-none tabular-nums text-ember">
                  {money(data.totals.recovered_amount, currency)}
                </p>
                <p className="mt-2 text-[13px] text-slate">collected since you connected</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
                <Stat label="Outstanding" value={money(data.totals.outstanding_amount, currency)} />
                <Stat label="Open invoices" value={String(data.totals.open_count)} />
                <Stat label="Reminders sent" value={String(data.totals.reminders_sent)} />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-paper p-5">
              <div className="text-[14px] text-slate">
                Plan:{" "}
                <span className="font-semibold capitalize text-ink">
                  {planActive ? data.subscription_status : "No active plan"}
                </span>
                {data.last_synced_at && <> · Last synced {new Date(data.last_synced_at).toLocaleString()}</>}
              </div>
              {data.subscription_status !== "none" && (
                <button onClick={openPortal} disabled={portalLoading} className="btn-ghost !px-5 !py-2.5 text-[14px] disabled:opacity-60">
                  {portalLoading ? "Opening…" : "Manage billing"}
                </button>
              )}
            </div>

            {!planActive && (
              <div className="mt-5 rounded-2xl border border-ember/40 bg-blush p-6 shadow-soft">
                <h3 className="font-display text-lg font-bold text-ink">Switch on automatic chasing</h3>
                <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-slate">
                  Forja is connected and watching your invoices. Start a 14-day free trial to let it send
                  the reminders for you — no card charged today, cancel anytime.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {PLANS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => subscribe(p.id)}
                      disabled={subscribing !== null}
                      className={`${p.id === "studio" ? "btn-ember" : "btn-ghost"} !px-5 !py-2.5 text-[14px] disabled:opacity-60`}
                    >
                      {subscribing === p.id ? "Starting…" : `Start trial · ${p.name} ${p.price}/mo`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 card p-7 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-bold text-ink">Tracked invoices</h2>
                <button
                  onClick={runChase}
                  disabled={chasing || !planActive}
                  title={planActive ? undefined : "Start your free trial to chase invoices"}
                  className="btn-ember !px-4 !py-2 text-[13px] disabled:opacity-60"
                >
                  {chasing ? "Chasing…" : "Run chase now"}
                </button>
              </div>
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
                        <span className="font-mono text-[15px] font-semibold tabular-nums text-ink">{money(inv.amount_due, inv.currency)}</span>
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
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-line bg-paper px-5 py-3 text-[14px] text-ink shadow-lift"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { getAdminMetrics, type AdminMetrics } from "../lib/api";
import { money } from "../lib/format";

function Metric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="card p-6 shadow-soft">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-slate">{label}</p>
      <p className={`mt-2 font-mono text-[28px] font-semibold leading-none tabular-nums ${accent ? "text-ember" : "text-ink"}`}>
        {value}
      </p>
      {sub && <p className="mt-2 text-[13px] text-slate">{sub}</p>}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="font-display text-lg font-bold tracking-tight2 text-ink">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  );
}

export function Admin() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<AdminMetrics | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (user?.is_admin) getAdminMetrics().then(setData).catch(() => setErrored(true));
  }, [user]);

  if (loading) {
    return (
      <section className="bg-mist">
        <div className="shell flex min-h-[60vh] items-center justify-center text-slate">Loading…</div>
      </section>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) return <Navigate to="/account" replace />;

  const cur = data?.collections.currency ?? "eur";

  return (
    <section className="bg-mist">
      <div className="shell py-14 sm:py-20">
        <Link to="/account" className="text-[14px] font-medium text-slate transition-colors hover:text-ink">
          &larr; Back to dashboard
        </Link>
        <h1 className="display mt-4 text-3xl sm:text-4xl text-ink">Admin</h1>
        <p className="mt-2 text-[15px] text-slate">Your Forja numbers, owner-only.</p>

        {data === null ? (
          errored ? (
            <p className="mt-10 text-[15px] text-slate">Could not load metrics. Refresh to try again.</p>
          ) : (
            <p className="mt-10 text-[15px] text-slate">Loading metrics…</p>
          )
        ) : (
          <>
            <Group title="Funnel">
              <Metric label="Leads" value={String(data.leads.total)} sub="free audits + enquiries" />
              <Metric label="Signups" value={String(data.users.total)} sub={`${data.users.new_7d} in the last 7 days`} />
              <Metric label="Connected Stripe" value={String(data.connections.connected)} />
              <Metric
                label="Paying"
                value={String(data.subscriptions.active)}
                sub={data.conversion.trial_to_paid_pct != null ? `${data.conversion.trial_to_paid_pct}% of started plans` : "no plans started yet"}
                accent
              />
            </Group>

            <Group title="Money">
              <Metric label="Recovered" value={money(data.collections.recovered_cents, cur)} accent sub="paid since launch" />
              <Metric label="Outstanding" value={money(data.collections.outstanding_cents, cur)} />
              <Metric label="Open invoices" value={String(data.collections.open_invoices)} />
              <Metric label="Reminders sent" value={String(data.collections.reminders_sent)} />
            </Group>

            <Group title="Subscriptions & health">
              <Metric label="Trialing" value={String(data.subscriptions.trialing)} />
              <Metric label="Verified emails" value={`${data.users.verified}/${data.users.total}`} />
              <Metric label="Past due" value={String(data.subscriptions.past_due)} />
              <Metric
                label="Connection errors"
                value={String(data.connections.errored)}
                accent={data.connections.errored > 0}
                sub={data.connections.errored > 0 ? "keys need reconnecting" : "all healthy"}
              />
            </Group>
          </>
        )}
      </div>
    </section>
  );
}

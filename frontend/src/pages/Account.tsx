import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { myRequests, myPayments, resendVerification, type RequestRecord, type PaymentRecord } from "../lib/api";

function formatAmount(amount?: number, currency?: string): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: (currency || "eur").toUpperCase() }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${(currency || "eur").toUpperCase()}`;
  }
}

export function Account() {
  const { user, loading, logout } = useAuth();
  const [requests, setRequests] = useState<RequestRecord[] | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[] | null>(null);
  const [resent, setResent] = useState<"idle" | "sending" | "sent">("idle");

  useEffect(() => {
    if (user) {
      myRequests().then(setRequests).catch(() => setRequests([]));
      myPayments().then(setPayments).catch(() => setPayments([]));
    }
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

  if (loading) {
    return (
      <section className="bg-mist">
        <div className="shell flex min-h-[60vh] items-center justify-center text-slate">Loading…</div>
      </section>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

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

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="card p-7 shadow-soft">
            <h2 className="font-display text-xl font-bold text-ink">Your requests</h2>
            {requests === null ? (
              <p className="mt-4 text-[15px] text-slate">Loading…</p>
            ) : requests.length === 0 ? (
              <p className="mt-4 text-[15px] leading-relaxed text-slate">
                No requests yet. Head to{" "}
                <a href="/#contact" className="font-medium text-ember hover:underline">
                  Start a project
                </a>
                .
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {requests.map((r, i) => (
                  <li key={i} className="py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px] font-semibold text-ink">{r.service || "General enquiry"}</span>
                      <span className="text-[13px] text-slate">{new Date(r.at).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-1 text-[15px] leading-relaxed text-slate">{r.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-7 shadow-soft">
            <h2 className="font-display text-xl font-bold text-ink">Orders</h2>
            {payments === null ? (
              <p className="mt-4 text-[15px] text-slate">Loading…</p>
            ) : payments.length === 0 ? (
              <p className="mt-4 text-[15px] leading-relaxed text-slate">
                No orders yet. When you pay a Forja invoice or link, it shows up here.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {payments.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-4">
                    <div>
                      <p className="text-[15px] font-medium text-ink">{p.description || "Forja engagement"}</p>
                      <p className="mt-1 text-[13px] text-slate">
                        {p.status} · {new Date(p.at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="font-display text-lg font-bold text-ember">{formatAmount(p.amount, p.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

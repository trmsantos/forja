import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { FormError } from "../components/FormError";
import {
  getReminderPreview,
  getReminderSettings,
  updateReminderSettings,
  type ReminderPreview,
  type ReminderTone,
} from "../lib/api";

const STEP_LABELS: Record<number, string> = { 1: "First (gentle)", 2: "Second (firmer)", 3: "Final" };

export function Reminders() {
  const { user, loading } = useAuth();

  const [businessName, setBusinessName] = useState("");
  const [tone, setTone] = useState<ReminderTone>("friendly");
  const [gapDays, setGapDays] = useState(7);

  const [preview, setPreview] = useState<ReminderPreview | null>(null);
  const [activeStep, setActiveStep] = useState(1);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    getReminderSettings()
      .then((s) => {
        setBusinessName(s.business_name);
        setTone(s.tone);
        setGapDays(s.gap_days);
      })
      .catch(() => setError("Could not load your reminder settings"));
    getReminderPreview().then(setPreview).catch(() => {});
  }, [user]);

  if (loading) {
    return (
      <section className="bg-mist">
        <div className="shell flex min-h-[60vh] items-center justify-center text-slate">Loading…</div>
      </section>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateReminderSettings({ business_name: businessName.trim(), tone, gap_days: gapDays });
      setPreview(await getReminderPreview()); // reflect the saved copy in the preview
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your reminder settings");
    } finally {
      setSaving(false);
    }
  }

  const current = preview?.steps.find((s) => s.step === activeStep) ?? preview?.steps[0];

  return (
    <section className="bg-mist">
      <div className="shell py-14 sm:py-20">
        <Link to="/account" className="text-[14px] font-medium text-slate transition-colors hover:text-ink">
          &larr; Back to dashboard
        </Link>
        <h1 className="display mt-4 text-3xl sm:text-4xl text-ink">Reminder emails</h1>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-slate">
          Set how Forja chases your clients, and see the exact emails they'll receive. Reminders escalate on
          their own — gentle first, firmer over time — and stop the instant an invoice is paid.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          {/* Settings */}
          <form onSubmit={save} className="card p-7 shadow-soft sm:p-8">
            <h2 className="font-display text-xl font-bold text-ink">Your settings</h2>

            <label className="mt-6 grid gap-2">
              <span className="text-[13px] font-semibold text-slate">Sender name</span>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                maxLength={80}
                placeholder="Your studio's name"
                className="field"
              />
              <span className="text-[13px] text-slate">How you appear to clients in the reminder. Defaults to your name.</span>
            </label>

            <div className="mt-6 grid gap-2">
              <span className="text-[13px] font-semibold text-slate">Tone</span>
              <div className="inline-flex w-full rounded-2xl border border-line bg-steel p-1">
                {(["friendly", "firm"] as ReminderTone[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`flex-1 rounded-xl px-4 py-2 text-[14px] font-semibold capitalize transition-colors ${
                      tone === t ? "bg-ember text-coal" : "text-slate hover:text-ink"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <span className="text-[13px] text-slate">
                {tone === "friendly" ? "Warmer wording, still escalates if unpaid." : "Direct and businesslike from the start."}
              </span>
            </div>

            <label className="mt-6 grid gap-2">
              <span className="text-[13px] font-semibold text-slate">Days between reminders</span>
              <input
                type="number"
                min={1}
                max={30}
                value={gapDays}
                onChange={(e) => setGapDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                className="field max-w-[8rem]"
              />
              <span className="text-[13px] text-slate">How long Forja waits before sending the next, firmer reminder.</span>
            </label>

            <div className="mt-7 flex items-center gap-4">
              <button type="submit" disabled={saving} className="btn-ember disabled:opacity-60">
                {saving ? "Saving…" : "Save & preview"}
              </button>
              {saved && <span className="text-[14px] text-ink">Saved.</span>}
            </div>
            <FormError message={error} />
          </form>

          {/* Preview */}
          <div className="card p-7 shadow-soft sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold text-ink">What your client sees</h2>
              <div className="inline-flex rounded-full border border-line bg-steel p-1">
                {[1, 2, 3].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setActiveStep(step)}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      activeStep === step ? "bg-paper text-ink shadow-soft" : "text-slate hover:text-ink"
                    }`}
                  >
                    {step === 1 ? "First" : step === 2 ? "Second" : "Final"}
                  </button>
                ))}
              </div>
            </div>

            {current ? (
              <>
                <p className="mt-5 text-[13px] text-slate">
                  <span className="font-semibold text-ink">{STEP_LABELS[current.step]}</span> · Subject
                </p>
                <p className="mt-1 text-[15px] font-medium text-ink">{current.subject}</p>
                <iframe
                  title={`Reminder preview — step ${current.step}`}
                  srcDoc={current.html}
                  sandbox=""
                  className="mt-4 h-[440px] w-full rounded-xl border border-line bg-white"
                />
                <p className="mt-3 text-[13px] text-slate">
                  Exactly what a client receives — shown with a sample invoice. Replies go to you, not Forja.
                </p>
              </>
            ) : (
              <p className="mt-5 text-[15px] text-slate">Loading preview…</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

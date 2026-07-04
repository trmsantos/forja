import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "../lib/api";
import { AuthShell } from "../components/AuthShell";
import { FormError } from "../components/FormError";

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(token!, next);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset your password");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthShell
        title="Link didn't work."
        subtitle="This password reset link is missing its token. Request a fresh one."
        footer={
          <Link to="/forgot-password" className="text-ember hover:underline">
            Request a new link
          </Link>
        }
      >
        <p className="text-[15px] leading-relaxed text-slate">
          Reset links expire after an hour — if this one is old, just start again.
        </p>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        title="Password updated."
        subtitle="Your password has been reset. You can log in with it now."
        footer={
          <Link to="/login" className="text-ember hover:underline">
            Log in
          </Link>
        }
      >
        <p className="text-[15px] leading-relaxed text-slate">All set — welcome back.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password."
      subtitle="Pick something at least 8 characters long."
      footer={
        <Link to="/login" className="text-ember hover:underline">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <input
          required
          type="password"
          placeholder="New password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="field"
          autoComplete="new-password"
        />
        <input
          required
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="field"
          autoComplete="new-password"
        />
        <button type="submit" disabled={busy} className="btn-ember disabled:opacity-60">
          {busy ? "Updating…" : "Update password"}
        </button>
        <FormError message={error} />
      </form>
    </AuthShell>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../lib/api";
import { AuthShell } from "../components/AuthShell";
import { FormError } from "../components/FormError";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset email");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your inbox."
        subtitle="If an account exists for that email, we've sent a link to reset your password. It expires in an hour."
        footer={
          <Link to="/login" className="text-ember hover:underline">
            Back to log in
          </Link>
        }
      >
        <p className="text-[15px] leading-relaxed text-slate">
          Didn't get it? Check your spam folder, or try again with the same address.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password."
      subtitle="Enter your email and we'll send you a link to set a new password."
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="text-ember hover:underline">
            Back to log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
          autoComplete="email"
        />
        <button type="submit" disabled={busy} className="btn-ember disabled:opacity-60">
          {busy ? "Sending…" : "Send reset link"}
        </button>
        <FormError message={error} />
      </form>
    </AuthShell>
  );
}

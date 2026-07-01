import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { AuthShell } from "../components/AuthShell";

export function Signup() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/account" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register(name, email, password);
      navigate("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account."
      subtitle="Track your requests and project status in one place. We'll email you a link to confirm your address."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-ember hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <input required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="field" />
        <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
        <input required type="password" autoComplete="new-password" placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
        <input required type="password" autoComplete="new-password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field" />
        <button type="submit" disabled={busy} className="btn-ember disabled:opacity-60">
          {busy ? "Creating…" : "Create account"}
        </button>
        {error && <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-ember">{error}</p>}
      </form>
    </AuthShell>
  );
}

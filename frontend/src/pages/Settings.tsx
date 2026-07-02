import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Avatar } from "../components/Avatar";
import {
  changePassword,
  disconnectStripe,
  getDashboard,
  removeAvatar,
  updateProfile,
  uploadAvatar,
} from "../lib/api";

const MAX_AVATAR_MB = 2;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

type Msg = { kind: "ok" | "err"; text: string } | null;

function Note({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p
      className={`mt-3 flex items-center gap-1.5 text-[14px] ${msg.kind === "ok" ? "text-ink" : "text-emberlit"}`}
      role="status"
    >
      {msg.kind === "ok" && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ember" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
      {msg.text}
    </p>
  );
}

export function Settings() {
  const { user, loading, setUser } = useAuth();

  // Profile
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Msg>(null);

  // Avatar
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<Msg>(null);

  // Password
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  // Stripe connection
  const [connected, setConnected] = useState<boolean | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [stripeMsg, setStripeMsg] = useState<Msg>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setDisplayName(user.display_name ?? "");
    }
  }, [user]);

  useEffect(() => {
    if (user) getDashboard().then((d) => setConnected(d.connected)).catch(() => setConnected(null));
  }, [user]);

  if (loading) {
    return (
      <section className="bg-mist">
        <div className="shell flex min-h-[60vh] items-center justify-center text-slate">Loading…</div>
      </section>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const updated = await updateProfile(name.trim(), displayName.trim());
      setUser(updated);
      setProfileMsg({ kind: "ok", text: "Profile saved." });
    } catch (err) {
      setProfileMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not save your profile" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setAvatarMsg(null);
    if (!ACCEPTED.includes(file.type)) {
      setAvatarMsg({ kind: "err", text: "Use a PNG, JPG, WEBP, or GIF image." });
      return;
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      setAvatarMsg({ kind: "err", text: `That image is too large (${MAX_AVATAR_MB} MB max).` });
      return;
    }
    setAvatarBusy(true);
    try {
      const { avatar_url } = await uploadAvatar(file);
      setUser({ ...user!, avatar_url });
      setAvatarMsg({ kind: "ok", text: "Photo updated." });
    } catch (err) {
      setAvatarMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not upload your photo" });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function clearAvatar() {
    setAvatarBusy(true);
    setAvatarMsg(null);
    try {
      await removeAvatar();
      setUser({ ...user!, avatar_url: null });
    } catch (err) {
      setAvatarMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not remove your photo" });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (next.length < 8) {
      setPwMsg({ kind: "err", text: "New password must be at least 8 characters." });
      return;
    }
    if (next !== confirm) {
      setPwMsg({ kind: "err", text: "The new passwords don't match." });
      return;
    }
    setSavingPw(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setPwMsg({ kind: "ok", text: "Password changed." });
    } catch (err) {
      setPwMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not change your password" });
    } finally {
      setSavingPw(false);
    }
  }

  async function onDisconnect() {
    if (!window.confirm("Disconnect Stripe? Forja will stop chasing until you reconnect.")) return;
    setDisconnecting(true);
    setStripeMsg(null);
    try {
      await disconnectStripe();
      setConnected(false);
      setStripeMsg({ kind: "ok", text: "Stripe disconnected. Chasing is paused." });
    } catch (err) {
      setStripeMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not disconnect Stripe" });
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <section className="bg-mist">
      <div className="shell max-w-3xl py-14 sm:py-20">
        <Link to="/account" className="text-[14px] font-medium text-slate transition-colors hover:text-ink">
          &larr; Back to dashboard
        </Link>
        <h1 className="display mt-4 text-3xl sm:text-4xl text-ink">Settings</h1>
        <p className="mt-2 text-[15px] text-slate">
          Signed in as <span className="text-ink">{user.email}</span>
          {!user.email_verified && <span className="text-emberlit"> · email not confirmed</span>}
        </p>

        {/* Profile — photo + identity */}
        <div className="mt-10 card p-7 shadow-soft sm:p-8">
          <h2 className="font-display text-xl font-bold text-ink">Your profile</h2>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar name={user.display_name || user.name} src={user.avatar_url} size={72} />
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarBusy}
                  className="btn-ghost !px-4 !py-2 text-[14px] disabled:opacity-60"
                >
                  {avatarBusy ? "Working…" : user.avatar_url ? "Change photo" : "Upload photo"}
                </button>
                {user.avatar_url && (
                  <button
                    type="button"
                    onClick={clearAvatar}
                    disabled={avatarBusy}
                    className="text-[14px] font-medium text-slate transition-colors hover:text-ink disabled:opacity-60"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[13px] text-slate">PNG, JPG, WEBP or GIF, up to {MAX_AVATAR_MB} MB.</p>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED.join(",")}
                onChange={onPickFile}
                className="hidden"
              />
            </div>
          </div>
          <Note msg={avatarMsg} />

          <form onSubmit={saveProfile} className="mt-7 grid gap-5 border-t border-line pt-7">
            <label className="grid gap-2">
              <span className="text-[13px] font-semibold text-slate">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                className="field"
                autoComplete="name"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-[13px] font-semibold text-slate">Preferred name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={60}
                placeholder="Optional"
                className="field"
              />
              <span className="text-[13px] text-slate">Shown when Forja greets you. Defaults to your name.</span>
            </label>
            <div className="flex items-center gap-4">
              <button type="submit" disabled={savingProfile} className="btn-ember disabled:opacity-60">
                {savingProfile ? "Saving…" : "Save profile"}
              </button>
            </div>
            <Note msg={profileMsg} />
          </form>
        </div>

        {/* Reminder emails */}
        <div className="mt-6 card p-7 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Reminder emails</h2>
              <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-slate">
                Set your sender name, tone, and cadence, and preview exactly what your clients receive.
              </p>
            </div>
            <Link to="/account/reminders" className="btn-ghost !px-5 !py-2.5 text-[14px]">
              Customize reminders
            </Link>
          </div>
        </div>

        {/* Password */}
        <div className="mt-6 card p-7 shadow-soft sm:p-8">
          <h2 className="font-display text-xl font-bold text-ink">Password</h2>
          <p className="mt-2 text-[14px] text-slate">Use at least 8 characters.</p>
          <form onSubmit={savePassword} className="mt-6 grid gap-5 sm:max-w-md">
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              placeholder="Current password"
              autoComplete="current-password"
              className="field"
            />
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              placeholder="New password"
              autoComplete="new-password"
              className="field"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="field"
            />
            <div>
              <button type="submit" disabled={savingPw} className="btn-ember disabled:opacity-60">
                {savingPw ? "Updating…" : "Update password"}
              </button>
            </div>
            <Note msg={pwMsg} />
          </form>
        </div>

        {/* Stripe connection */}
        <div className="mt-6 card p-7 shadow-soft sm:p-8">
          <h2 className="font-display text-xl font-bold text-ink">Stripe connection</h2>
          <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-slate">
            {connected
              ? "Forja is connected to your Stripe and watching your invoices. Disconnecting stops all chasing immediately; your synced history stays until you reconnect."
              : "No active Stripe connection. Connect one from the dashboard to start chasing overdue invoices."}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            {connected ? (
              <button
                type="button"
                onClick={onDisconnect}
                disabled={disconnecting}
                className="btn-ghost !border-ember/40 !px-5 !py-2.5 text-[14px] text-emberlit disabled:opacity-60"
              >
                {disconnecting ? "Disconnecting…" : "Disconnect Stripe"}
              </button>
            ) : (
              <Link to="/account" className="btn-ember !px-5 !py-2.5 text-[14px]">
                Connect Stripe
              </Link>
            )}
          </div>
          <Note msg={stripeMsg} />
        </div>
      </div>
    </section>
  );
}

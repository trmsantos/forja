import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail, getToken } from "../lib/api";
import { useAuth } from "../lib/auth";
import { AuthShell } from "../components/AuthShell";

type State = "working" | "ok" | "error";

export function Verify() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { refresh } = useAuth();
  const [state, setState] = useState<State>("working");
  const ran = useRef(false);
  const loggedIn = !!getToken();

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setState("error");
      return;
    }
    verifyEmail(token)
      .then(async () => {
        if (loggedIn) await refresh();
        setState("ok");
      })
      .catch(() => setState("error"));
  }, [token, loggedIn, refresh]);

  const title = state === "working" ? "Confirming…" : state === "ok" ? "Email confirmed." : "Link didn't work.";
  const subtitle =
    state === "working"
      ? "One moment while we confirm your email."
      : state === "ok"
        ? "Your account is verified. You're all set."
        : "This confirmation link is invalid or has expired. Log in and resend a fresh one.";

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      footer={
        state === "ok" ? (
          <Link to={loggedIn ? "/account" : "/login"} className="text-ember hover:underline">
            {loggedIn ? "Go to your account" : "Log in"}
          </Link>
        ) : (
          <Link to="/login" className="text-ember hover:underline">
            Go to log in
          </Link>
        )
      }
    >
      <p className="text-[15px] leading-relaxed text-slate">
        {state === "working" && "Verifying your link…"}
        {state === "ok" && "Thanks for confirming."}
        {state === "error" && "No need to worry — you can request a new link from your account."}
      </p>
    </AuthShell>
  );
}

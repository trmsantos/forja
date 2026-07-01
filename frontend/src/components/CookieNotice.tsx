import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const KEY = "forja_cookie_notice";

// Essential-only storage → a notice, not a consent gate (no tracking/ads cookies to gate on).
export function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(localStorage.getItem(KEY) !== "dismissed");
    } catch {
      /* storage blocked — just don't show */
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "dismissed");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4" role="region" aria-label="Cookie notice">
      <div className="shell">
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4 shadow-lift sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px] leading-relaxed text-slate">
            Forja uses one essential cookie to keep you signed in — no tracking, no ads.{" "}
            <Link to="/privacy" className="font-medium text-ember hover:underline">How we handle your data</Link>.
          </p>
          <button onClick={dismiss} className="btn-ember shrink-0 !px-5 !py-2.5 text-[14px]">Got it</button>
        </div>
      </div>
    </div>
  );
}

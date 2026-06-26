import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { nav } from "../lib/content";
import { useAuth } from "../lib/auth";

export function Nav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const onHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="shell flex h-16 items-center justify-between">
        <Link to="/" aria-label="Forja home" onClick={() => setOpen(false)}>
          <Logo size={30} />
        </Link>

        {onHome && (
          <nav className="hidden items-center gap-8 md:flex">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="text-[15px] font-medium text-slate transition-colors hover:text-ink">
                {n.label}
              </a>
            ))}
          </nav>
        )}

        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <Link to="/account" className="btn-dark !px-5 !py-2.5 text-[14px]">
              {user.name.split(" ")[0]}
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-[15px] font-medium text-slate hover:text-ink">
                Log in
              </Link>
              <Link to="/signup" className="btn-ember !px-5 !py-2.5 text-[14px]">
                Start free
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="border-t border-line bg-paper md:hidden">
          <div className="shell flex flex-col py-4">
            {nav.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-xl px-2 py-3 text-[16px] font-medium text-ink hover:bg-mist">
                {n.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
              {user ? (
                <Link to="/account" onClick={() => setOpen(false)} className="btn-dark">
                  {user.name.split(" ")[0]}&rsquo;s account
                </Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="btn-ghost">
                    Log in
                  </Link>
                  <Link to="/signup" onClick={() => setOpen(false)} className="btn-ember">
                    Start free
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

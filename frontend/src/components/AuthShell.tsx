import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-mist">
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-ember/12 blur-[120px]" />
      <div className="shell relative flex min-h-[78vh] items-center justify-center py-16">
        <div className="w-full max-w-md rounded-3xl border border-line bg-paper p-8 shadow-lift">
          <Link to="/" aria-label="Forja home" className="inline-flex">
            <Logo size={30} />
          </Link>
          <h1 className="display mt-7 text-3xl text-ink">{title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate">{subtitle}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-7 border-t border-line pt-5 text-[14px] text-slate">{footer}</div>
        </div>
      </div>
    </section>
  );
}

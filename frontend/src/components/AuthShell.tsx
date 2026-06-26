import type { ReactNode } from "react";

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
    <section className="bg-mist">
      <div className="shell flex min-h-[74vh] items-center justify-center py-16">
        <div className="w-full max-w-md rounded-3xl border border-line bg-paper p-8 shadow-soft">
          <h1 className="display text-3xl text-ink">{title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate">{subtitle}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-7 border-t border-line pt-5 text-[14px] text-slate">{footer}</div>
        </div>
      </div>
    </section>
  );
}

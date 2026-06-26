import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { brand } from "../lib/content";

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="shell flex flex-col gap-8 py-14 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Logo size={28} />
          <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-slate">{brand.tagline}</p>
        </div>
        <div className="flex flex-col gap-2 text-[14px] text-slate sm:items-end">
          <a href={`mailto:${brand.email}`} className="font-medium text-ink hover:text-ember">
            {brand.email}
          </a>
          <span className="flex gap-4">
            <Link to="/login" className="hover:text-ink">Log in</Link>
            <Link to="/signup" className="hover:text-ink">Create account</Link>
          </span>
          <span>© {new Date().getFullYear()} Forja — built by people</span>
        </div>
      </div>
    </footer>
  );
}

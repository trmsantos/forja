import { useState } from "react";
import { services, brand } from "../lib/content";
import { submitLead } from "../lib/api";
import { Reveal } from "./Reveal";

type Status = "idle" | "sending" | "sent" | "error";

export function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [form, setForm] = useState({ name: "", email: "", company: "", service: "", message: "" });

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      await submitLead(form);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="bg-paper">
      <div className="shell py-24 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="display text-[clamp(2rem,4.5vw,3.2rem)] text-ink">Questions before you start?</h2>
          <p className="mx-auto mt-5 max-w-prose text-[17px] leading-relaxed text-slate">
            Tell us how you bill and we'll tell you if Forja is a fit. We reply within two working days.
          </p>
        </Reveal>

        <Reveal className="mx-auto mt-12 max-w-2xl" delay={0.05}>
          {status === "sent" ? (
            <div className="card p-10 text-center shadow-soft">
              <h3 className="font-display text-2xl font-bold text-ink">Got it. Thank you.</h3>
              <p className="mt-3 text-[16px] leading-relaxed text-slate">
                Your message is in. We'll be in touch within two working days.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="card grid gap-4 p-7 shadow-soft sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <input required placeholder="Your name" value={form.name} onChange={update("name")} className="field" />
                <input required type="email" placeholder="Email" value={form.email} onChange={update("email")} className="field" />
              </div>
              <input placeholder="Company (optional)" value={form.company} onChange={update("company")} className="field" />
              <select value={form.service} onChange={update("service")} className="field">
                <option value="">What do you need? (optional)</option>
                {services.map((s) => (
                  <option key={s.id} value={s.title}>
                    {s.title}
                  </option>
                ))}
                <option value="Not sure yet">Not sure yet</option>
              </select>
              <textarea
                required
                rows={5}
                placeholder="What do you use to invoice, and how many slip past due?"
                value={form.message}
                onChange={update("message")}
                className="field"
              />
              <button type="submit" disabled={status === "sending"} className="btn-ember disabled:opacity-60">
                {status === "sending" ? "Sending…" : "Send it"}
              </button>
              {status === "error" && <p className="text-[14px] text-emberlit">Something went wrong — email us at {brand.email}.</p>}
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}

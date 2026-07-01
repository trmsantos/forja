import { brand } from "../lib/content";

const UPDATED = "1 July 2026";

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="display mt-10 text-2xl text-ink">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-slate">{children}</p>;
}

export function Privacy() {
  return (
    <section className="bg-mist">
      <div className="shell py-16 sm:py-20">
        <h1 className="display text-4xl text-ink">Privacy Policy</h1>
        <p className="mt-2 text-[14px] text-slate">Last updated: {UPDATED}</p>

        <P>
          Forja helps businesses chase their own overdue invoices. This policy explains what we
          collect, why, and your choices. It is a starting template — have it reviewed by a lawyer
          before you rely on it commercially.
        </P>

        <H>Who we are</H>
        <P>
          Forja ("we"), contactable at {brand.email}. For your account data we act as the data
          controller. For the invoice and debtor data we read from your Stripe account, you are the
          controller and we act as your processor, handling it only to provide the service.
        </P>

        <H>What we collect</H>
        <P>
          Account data: your name, email, and a hashed password. Connection data: your Stripe
          restricted key, stored encrypted at rest. Invoice data synced from Stripe: customer names,
          emails, amounts, due dates, and payment status. Activity: a log of reminders sent. We do not
          store full card numbers — payments are handled by Stripe.
        </P>

        <H>How we use it</H>
        <P>
          To run your account, read your open invoices, send escalating payment reminders on your
          behalf (with you in Reply-To), show your dashboard, and bill your subscription. We do not
          sell your data or your clients' data.
        </P>

        <H>Sub-processors</H>
        <P>
          We rely on: Stripe (payments and invoice data), Resend (sending email), Vercel (hosting for
          the site and the serverless API), and Neon (managed Postgres database). Each processes data
          only to deliver their part of the service.
        </P>

        <H>Cookies &amp; local storage</H>
        <P>
          Forja uses a single essential item in your browser's storage to keep you signed in after you
          log in. We don't use advertising or third-party tracking cookies, and we don't run profiling
          analytics. Because this storage is strictly necessary to provide the service, it doesn't
          require consent — you can clear it anytime by logging out or clearing your browser storage.
        </P>

        <H>Retention &amp; deletion</H>
        <P>
          You can disconnect Stripe at any time, which stops syncing and chasing. On account deletion
          we remove your account, connection, and synced invoice data. Email us at {brand.email} to
          request access, correction, export, or deletion of your data.
        </P>

        <H>Legal basis</H>
        <P>
          We process data under the GDPR (Regulation (EU) 2016/679) and Portuguese Law n.º 58/2019:
          to perform our contract with you (running your account and the service), and on our
          legitimate interest in operating and securing Forja. Reminders are sent on your behalf as
          part of providing the service to you.
        </P>

        <H>Your rights</H>
        <P>
          If you're in the EU/EEA, you have rights under the GDPR — access, rectification, erasure,
          restriction, portability, and objection. Contact {brand.email} and we'll respond within the
          legal timeframe. You may also complain to the Portuguese supervisory authority, the CNPD
          (cnpd.pt).
        </P>

        <H>Contact</H>
        <P>Questions about this policy? Email {brand.email}.</P>
      </div>
    </section>
  );
}

import { brand } from "../lib/content";

const UPDATED = "28 June 2026";

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="display mt-10 text-2xl text-ink">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-slate">{children}</p>;
}

export function Terms() {
  return (
    <section className="bg-mist">
      <div className="shell py-16 sm:py-20">
        <h1 className="display text-4xl text-ink">Terms of Service</h1>
        <p className="mt-2 text-[14px] text-slate">Last updated: {UPDATED}</p>

        <P>
          These terms govern your use of Forja and are subject to Portuguese law. They are a starting
          template — have them reviewed by a lawyer before you rely on them commercially. By creating
          an account you agree to them.
        </P>

        <H>Provider (Prestador)</H>
        <P>
          Service operated by [NAME / COMPANY], NIF [______], with address at [______], contactable at{" "}
          {brand.email}. (Identification required under Decreto-Lei n.º 7/2004; complete it when you
          register your activity.)
        </P>

        <H>The service</H>
        <P>
          Forja connects to your Stripe account with a read-only restricted key, imports your open
          invoices, and sends polite, escalating payment reminders to your clients until an invoice is
          paid. You remain responsible for the content and legitimacy of the invoices you chase.
        </P>

        <H>Subscriptions &amp; billing</H>
        <P>
          Paid plans (Solo, Studio, Agency) are billed monthly via Stripe and start with a free trial.
          You can cancel anytime from the billing portal; cancellation stops future charges and the
          chasing engine at the end of the period. Fees already paid are non-refundable except where
          required by law.
        </P>

        <H>Right of withdrawal (Livre resolução)</H>
        <P>
          If you are a consumer, you have 14 days to withdraw from a distance contract (Decreto-Lei
          n.º 24/2014). Because Forja is a digital service that begins as soon as you connect Stripe
          and start chasing, by doing so during the trial you expressly ask us to begin and acknowledge
          you may lose that 14-day right once the service has fully started.
        </P>

        <H>Acceptable use</H>
        <P>
          Use Forja only to chase invoices you are legally entitled to collect. Don't use it to harass,
          mislead, or contact people you have no legitimate billing relationship with. We may suspend
          accounts that abuse the service.
        </P>

        <H>Your Stripe key</H>
        <P>
          You provide a read-only restricted key and may revoke it anytime in Stripe or by
          disconnecting in the dashboard. We store it encrypted and use it only to read your invoices
          and to chase the overdue ones.
        </P>

        <H>Disclaimer &amp; liability</H>
        <P>
          Forja is provided "as is". We don't guarantee that any specific invoice will be paid. To the
          extent permitted by law, our total liability is limited to the fees you paid in the prior 12
          months. We are not liable for indirect or consequential losses.
        </P>

        <H>Disputes &amp; consumer resolution</H>
        <P>
          If you are a consumer and we can't resolve a complaint directly, you may use alternative
          dispute resolution. Submit complaints via the electronic Complaints Book
          (livroreclamacoes.pt) and, for online purchases, the EU ODR platform at
          ec.europa.eu/consumers/odr.
        </P>

        <H>Termination &amp; governing law</H>
        <P>
          You may close your account anytime. These terms are governed by Portuguese law, with the
          courts of Portugal competent, without prejudice to the mandatory consumer-protection rules
          of your country of residence.
        </P>

        <H>Contact</H>
        <P>Questions about these terms? Email {brand.email}.</P>
      </div>
    </section>
  );
}

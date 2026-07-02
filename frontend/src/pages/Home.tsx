import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { Hero } from "../components/Hero";
import { Services } from "../components/Services";
import { Comparison } from "../components/Comparison";
import { Outcomes } from "../components/Outcomes";
import { Process } from "../components/Process";
import { Security } from "../components/Security";
import { Pricing } from "../components/Pricing";
import { Faq } from "../components/Faq";
import { Contact } from "../components/Contact";
import { FinalCta } from "../components/FinalCta";

export function Home() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [hash]);

  return (
    <div>
      <Hero />
      {/* Answer "don't I already have this in Stripe?" and prove trust before anything else —
          both are make-or-break for a tool that touches someone's Stripe + client relationships. */}
      <Comparison />
      <Security />
      <Services />
      <Process />
      <Outcomes />
      <Pricing />
      <Faq />
      <Contact />
      <FinalCta />
    </div>
  );
}

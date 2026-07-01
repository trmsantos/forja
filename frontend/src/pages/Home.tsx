import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { Hero } from "../components/Hero";
import { Services } from "../components/Services";
import { Comparison } from "../components/Comparison";
import { Outcomes } from "../components/Outcomes";
import { Process } from "../components/Process";
import { Testimonials } from "../components/Testimonials";
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
      <Services />
      <Comparison />
      <Outcomes />
      <Process />
      <Testimonials />
      <Security />
      <Pricing />
      <Faq />
      <Contact />
      <FinalCta />
    </div>
  );
}

import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { brand } from "../lib/content";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

const wrap = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const line = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

// Sparks fly off the top-right corner of the mark, on a gentle loop.
const SPARKS = [
  { x: 150, y: 44, dx: 34, dy: -30, d: 0.0 },
  { x: 158, y: 56, dx: 46, dy: -16, d: 0.5 },
  { x: 150, y: 32, dx: 26, dy: -44, d: 1.0 },
  { x: 162, y: 48, dx: 52, dy: -34, d: 1.5 },
  { x: 146, y: 52, dx: 30, dy: -10, d: 0.8 },
];

function ForgeMark() {
  const reduce = useReducedMotion();
  const piece = (delay: number) => ({
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: "spring" as const, duration: 0.55, bounce: 0.22, delay },
  });
  return (
    <svg viewBox="0 0 220 220" className="h-full w-full" role="img" aria-label="The Forja mark being forged">
      {/* stamp tile */}
      <motion.rect x="30" y="36" width="140" height="140" rx="34" fill="#16171b" {...piece(0.1)} />
      {/* F bars */}
      <motion.rect x="72" y="72" width="18" height="88" rx="4" fill="#ffffff" {...piece(0.28)} />
      <motion.rect x="72" y="72" width="58" height="18" rx="4" fill="#ffffff" {...piece(0.36)} />
      <motion.rect x="72" y="110" width="42" height="18" rx="4" fill="#ffffff" {...piece(0.44)} />
      {/* ember spark in the mark */}
      <motion.rect x="120" y="110" width="16" height="16" rx="4" fill="#f1531c" {...piece(0.56)} />
      {/* flying sparks */}
      {!reduce &&
        SPARKS.map((s, i) => (
          <motion.rect
            key={i}
            x={s.x}
            y={s.y}
            width="6"
            height="6"
            rx="1.5"
            fill="#f1531c"
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.95, 0], x: [0, s.dx], y: [0, s.dy], scale: [0.6, 1, 0.5] }}
            transition={{ duration: 1.7, repeat: Infinity, ease: "easeOut", delay: 1 + s.d, repeatDelay: 0.6 }}
          />
        ))}
    </svg>
  );
}

export function Hero() {
  return (
    <section id="top" className="overflow-hidden bg-paper">
      <div className="shell grid items-center gap-12 pt-16 pb-16 sm:pt-24 sm:pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        <motion.div variants={wrap} initial="hidden" animate="show" className="max-w-2xl">
          <motion.h1 variants={line} className="display text-[clamp(2.5rem,6.2vw,4.8rem)] text-ink">
            Late invoices,{" "}
            <span className="relative inline-block whitespace-nowrap text-ember">
              chased automatically
              <svg
                className="pointer-events-none absolute -bottom-1 left-0 h-3 w-full"
                viewBox="0 0 300 24"
                preserveAspectRatio="none"
                fill="none"
                aria-hidden="true"
              >
                <motion.path
                  d="M5 15 C70 5 120 21 175 11 S270 6 295 15"
                  stroke="#f1531c"
                  strokeWidth="6"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.75 }}
                />
              </svg>
            </span>
            .
          </motion.h1>

          <motion.p variants={line} className="mt-7 max-w-prose text-[19px] leading-relaxed text-slate">
            {brand.intro}
          </motion.p>

          <motion.div variants={line} className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/signup" className="btn-ember">
              Start free
            </Link>
            <a href="#process" className="btn-ghost">
              See how it works
            </a>
          </motion.div>
        </motion.div>

        <div className="mx-auto w-full max-w-[300px] sm:max-w-[360px]">
          <ForgeMark />
        </div>
      </div>
    </section>
  );
}

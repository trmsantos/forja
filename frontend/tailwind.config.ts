import type { Config } from "tailwindcss";

// Dark "forge" system. A warm charcoal foundry canvas, molten ember as the heat/accent, and
// hot-spark moments. Grounded in the brand's physical object (a forge) so it doesn't read as
// generic dark-tech (near-black + one vermilion accent is the AI default we're avoiding).
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Values live as CSS custom properties (RGB channels; see src/index.css) so theme switching
      // is a single data-theme flip. The rgb(var(...) / <alpha-value>) form lets Tailwind inject
      // the alpha channel, so both solid classes (bg-ember) AND opacity modifiers (bg-ember/40,
      // ring-ember/15, text-coal/80, …) keep working exactly as before — now resolved per theme.
      colors: {
        coal: "rgb(var(--color-coal) / <alpha-value>)", // text on ember, the "anvil" band
        mist: "rgb(var(--color-mist) / <alpha-value>)", // page canvas
        paper: "rgb(var(--color-paper) / <alpha-value>)", // surface / cards
        steel: "rgb(var(--color-steel) / <alpha-value>)", // elevated panels, inputs
        line: "rgb(var(--color-line) / <alpha-value>)", // hairline borders
        ink: "rgb(var(--color-ink) / <alpha-value>)", // primary text
        slate: "rgb(var(--color-slate) / <alpha-value>)", // muted text
        ember: "rgb(var(--color-ember) / <alpha-value>)", // primary accent (molten)
        emberlit: "rgb(var(--color-emberlit) / <alpha-value>)", // hover / glow
        emberdeep: "rgb(var(--color-emberdeep) / <alpha-value>)",
        blush: "rgb(var(--color-blush) / <alpha-value>)", // ember-tinted surface (category color)
        sky: "rgb(var(--color-sky) / <alpha-value>)", // cool-tinted surface
        mint: "rgb(var(--color-mint) / <alpha-value>)", // green-tinted surface
      },
      fontFamily: {
        // Display kept (Bricolage is distinctive, not a reflex default). Body swapped off
        // Plus Jakarta Sans (a reflex-reject face) to Geist; Geist Mono for financial figures.
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Geist"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      maxWidth: {
        shell: "1180px",
        prose: "60ch",
      },
      letterSpacing: {
        tight2: "-0.025em",
      },
      borderRadius: {
        "2xl": "1.1rem",
        "3xl": "1.6rem",
      },
      boxShadow: {
        // soft/lift resolve through variables so the light theme can use a softer, warm-tinted
        // shadow (a heavy black shadow reads as too harsh on a light canvas). See src/index.css.
        soft: "var(--shadow-soft)",
        lift: "var(--shadow-lift)",
        ember: "0 10px 40px -12px rgba(241,83,28,0.45)",
      },
    },
  },
  plugins: [],
};

export default config;

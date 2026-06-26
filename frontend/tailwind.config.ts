import type { Config } from "tailwindcss";

// Dark "forge" system. A warm charcoal foundry canvas, molten ember as the heat/accent, and
// hot-spark moments. Grounded in the brand's physical object (a forge) so it doesn't read as
// generic dark-tech (near-black + one vermilion accent is the AI default we're avoiding).
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        coal: "#0b0c0e", // deepest: text on ember, the "anvil" band
        mist: "#0e0f13", // page canvas
        paper: "#16181d", // surface / cards
        steel: "#1e212a", // elevated panels, inputs, second neutral layer
        line: "#2a2d35", // hairline borders
        ink: "#f3f1ee", // primary text (warm off-white)
        slate: "#9aa0ac", // muted text
        ember: "#f1531c", // primary accent (molten)
        emberlit: "#ff6a33", // hover / glow
        emberdeep: "#c63f12",
        blush: "#241611", // ember-tinted dark surface (category color)
        sky: "#111a2b", // cool-tinted dark surface
        mint: "#0f201a", // green-tinted dark surface
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
        // Drop shadows barely read on dark; keep them deep and lean on borders + ember glow.
        soft: "0 16px 50px -24px rgba(0,0,0,0.7)",
        lift: "0 30px 70px -28px rgba(0,0,0,0.8)",
        ember: "0 10px 40px -12px rgba(241,83,28,0.45)",
      },
    },
  },
  plugins: [],
};

export default config;

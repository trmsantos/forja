import type { Config } from "tailwindcss";

// Light, modern system. Clean white/cool-gray canvas, ink text, a warm ember primary, and a small
// set of soft tinted surfaces (blush/sky/mint) for category color — modern and friendly without the
// purple-gradient AI cliché. Depth via soft shadows + rounded corners (not over-rounded).
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16171b",
        slate: "#5b606b",
        paper: "#ffffff",
        mist: "#f4f5f8",
        line: "#e7e8ec",
        ember: "#f1531c",
        emberdeep: "#c63f12",
        blush: "#ffeee7",
        sky: "#ebf1ff",
        mint: "#e8f8ee",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
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
        soft: "0 12px 40px -16px rgba(20,22,26,0.16)",
        lift: "0 24px 60px -20px rgba(20,22,26,0.22)",
      },
    },
  },
  plugins: [],
};

export default config;

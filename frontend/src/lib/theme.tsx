import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Theme state for the app. The palette itself lives in CSS variables (src/index.css); switching is
// just flipping document.documentElement's data-theme. An inline script in index.html applies the
// initial value synchronously before React mounts (no flash of the wrong theme), so here we read
// that already-applied value first to stay in lockstep with what's on screen.

type Theme = "light" | "dark";
const STORAGE_KEY = "forja_theme";

type ThemeState = { theme: Theme; setTheme: (t: Theme) => void };
const ThemeContext = createContext<ThemeState | undefined>(undefined);

function resolveInitialTheme(): Theme {
  // 1) whatever the pre-React inline script already set on <html>
  const applied = document.documentElement.dataset.theme;
  if (applied === "light" || applied === "dark") return applied;
  // 2) an explicit past choice
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* localStorage unavailable (private mode) — fall through */
  }
  // 3) system preference, defaulting to the dark "forge" theme
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function setTheme(next: Theme) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore persistence failures */
    }
    // Crossfade the switch (see .theme-transition in index.css), skipping it under reduced motion.
    const root = document.documentElement;
    const animate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (animate) {
      root.classList.add("theme-transition");
      // Prime the transition: force a style/layout flush so there's a "before" frame with the
      // transition active and the OLD colors. Without this, adding the class and changing the
      // variable land in one recalc and the browser skips the transition entirely (verified: it
      // starts 0 transitions vs 1 with the flush). The theme is then changed synchronously below,
      // so this reflow is the baseline — we don't defer the change to an effect (unreliable timing).
      void root.offsetWidth;
    }
    root.dataset.theme = next;
    setThemeState(next);
    if (animate) {
      window.setTimeout(() => root.classList.remove("theme-transition"), 360);
    }
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

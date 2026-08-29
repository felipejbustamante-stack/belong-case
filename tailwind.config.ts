import type { Config } from "tailwindcss";

/**
 * Every colour resolves to a CSS variable defined in `globals.css`, so light
 * and dark are one token set rather than two stylesheets.
 *
 * `brand` carries identity and action. `danger` / `warn` / `good` carry policy
 * status — red, amber or green against a service or move-in commitment — and
 * are deliberately never reused for decoration.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "var(--ground)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        sunken: "var(--sunken)",
        ink: "var(--ink)",
        ink2: "var(--ink-2)",
        ink3: "var(--ink-3)",
        line: "var(--line)",
        line2: "var(--line-2)",
        brand: "var(--brand)",
        brandInk: "var(--brand-ink)",
        brandWash: "var(--brand-wash)",
        brandLine: "var(--brand-line)",
        terracotta: "var(--terracotta)",
        terracottaWash: "var(--terracotta-wash)",
        accent: "var(--accent)",
        accentWash: "var(--accent-wash)",
        danger: "var(--red)",
        dangerBg: "var(--red-bg)",
        dangerLine: "var(--red-line)",
        warn: "var(--amber)",
        warnBg: "var(--amber-bg)",
        warnLine: "var(--amber-line)",
        good: "var(--green)",
        goodBg: "var(--green-bg)",
        goodLine: "var(--green-line)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
        // retained so existing `font-cond` usages resolve to the UI face
        cond: ["var(--font-sans)"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)",
      },
      maxWidth: {
        shell: "1320px",
      },
    },
  },
  plugins: [],
} satisfies Config;

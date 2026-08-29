import type { Config } from "tailwindcss";

/**
 * The palette and type scale carried over from the case deliverables, so the
 * product reads as the same system as the readout and the operating plan.
 * Semantic colours (red / amber / green) are policy status, never decoration —
 * keep them separate from the accent.
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
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        cond: ["var(--font-cond)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;

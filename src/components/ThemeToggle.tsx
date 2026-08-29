"use client";

import { useEffect, useState } from "react";

type Choice = "light" | "dark" | "system";

/**
 * The demo runs on someone else's projector. Being able to force light or dark
 * in one click — rather than hoping the room's colour scheme flatters the
 * palette — is a presentation requirement, not a preference pane.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [choice, setChoice] = useState<Choice>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("belong-theme") as Choice | null) ?? "system";
    setChoice(stored);
  }, []);

  function apply(next: Choice) {
    setChoice(next);
    try {
      localStorage.setItem("belong-theme", next);
    } catch {
      // a blocked storage API must not break the toggle itself
    }
    const root = document.documentElement;
    if (next === "system") delete root.dataset.theme;
    else root.dataset.theme = next;
  }

  const OPTIONS: { key: Choice; label: string }[] = [
    { key: "light", label: "Light" },
    { key: "system", label: "Auto" },
    { key: "dark", label: "Dark" },
  ];

  return (
    <div
      className={`inline-flex items-center rounded-full border border-line bg-surface2 p-0.5 ${className}`}
      role="group"
      aria-label="Colour theme"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => apply(o.key)}
          aria-pressed={choice === o.key}
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
            choice === o.key
              ? "bg-brand text-brandInk"
              : "text-ink3 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Interface primitives.
 *
 * Two conventions run through all of them and are worth keeping:
 *   - Status tone (danger / warn / good) means a policy state, never emphasis.
 *     If something needs emphasis without a status meaning, it uses `brand`.
 *   - Anything the engine derived is rendered in mono. Anything it advises is
 *     rendered in sans. An operator can tell them apart across a room.
 */

import Link from "next/link";
import type { ReactNode } from "react";

export type Tone = "danger" | "warn" | "good" | "brand" | "neutral";

const TONE: Record<Tone, string> = {
  danger: "border-dangerLine bg-dangerBg text-danger",
  warn: "border-warnLine bg-warnBg text-warn",
  good: "border-goodLine bg-goodBg text-good",
  brand: "border-brandLine bg-brandWash text-brand",
  neutral: "border-line bg-surface2 text-ink2",
};

/** Maps a priority string of any shape onto a status tone. */
export function priorityTone(priority: string): Tone {
  const p = priority.toUpperCase();
  if (p.startsWith("P0") || p.includes("CRITICAL")) return "danger";
  if (p.startsWith("P1") || p.includes("HIGH")) return "warn";
  if (p.includes("CLOSED")) return "neutral";
  return "good";
}

export function severityTone(severity: "high" | "med" | "low"): Tone {
  return severity === "high" ? "danger" : severity === "med" ? "warn" : "good";
}

export function riskTone(risk: string): Tone {
  return risk === "RED" ? "danger" : risk === "AMBER" ? "warn" : "good";
}

/* ------------------------------------------------------------------ shapes */

export function Card({
  children,
  className = "",
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section" | "aside";
}) {
  return (
    <As
      className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}
    >
      {children}
    </As>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className = "",
  title,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Red / amber / green against a service or move-in commitment. */
export function RagDot({ risk, withLabel = false }: { risk: string; withLabel?: boolean }) {
  const tone = riskTone(risk);
  const dot =
    tone === "danger" ? "bg-danger" : tone === "warn" ? "bg-warn" : "bg-good";
  return (
    <span className="inline-flex items-center gap-1.5" title={`${risk} against its commitment`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className={withLabel ? "text-[11.5px] font-semibold text-ink2" : "sr-only"}>
        {risk}
      </span>
    </span>
  );
}

export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`label ${className}`}>{children}</p>;
}

/* ----------------------------------------------------------------- actions */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "border-brand bg-brand text-brandInk hover:opacity-90 disabled:opacity-40",
  secondary:
    "border-line bg-surface text-ink hover:border-brand hover:text-brand disabled:opacity-40",
  ghost:
    "border-transparent bg-transparent text-ink2 hover:bg-surface2 hover:text-ink disabled:opacity-40",
  danger:
    "border-dangerLine bg-dangerBg text-danger hover:opacity-90 disabled:opacity-40",
};

const SIZE = {
  sm: "px-3 py-1.5 text-[12.5px]",
  md: "px-4 py-2.5 text-[13.5px]",
  lg: "px-6 py-3.5 text-[14.5px]",
} as const;

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: keyof typeof SIZE;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  href,
  variant = "secondary",
  size = "md",
  className = "",
}: {
  children: ReactNode;
  href: string;
  variant?: ButtonVariant;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------ traceability */

/**
 * A priority is never shown without the rule that produced it and the policy
 * clause that rule rests on. An operator overriding the engine has to be able
 * to see what they are overriding — that is a product requirement, not debug
 * output.
 */
export function RuleRef({
  id,
  label,
  clause,
  className = "",
}: {
  id: string;
  label: string;
  clause?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 ${className}`}>
      <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-ink2">
        {id}
      </code>
      <span className="text-[12.5px] text-ink2">{label}</span>
      {clause && (
        <details className="w-full">
          <summary className="cursor-pointer text-[11.5px] font-semibold text-brand hover:underline">
            Policy clause
          </summary>
          <p className="mt-1.5 border-l-2 border-brandLine pl-3 text-[12.5px] leading-relaxed text-ink2">
            {clause}
          </p>
        </details>
      )}
    </span>
  );
}

/**
 * The security moment of the product. Third-party text written to be obeyed by
 * an automated reader is pulled out BEFORE anything is analysed, and the
 * operator is shown exactly what was removed — a quarantine nobody can see is
 * indistinguishable from no quarantine at all.
 */
export function QuarantineNotice({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="overflow-hidden rounded-xl border border-dangerLine bg-dangerBg">
      <div className="border-l-4 border-danger p-4">
        <p className="font-semibold text-danger">
          {items.length} embedded instruction{items.length > 1 ? "s" : ""} quarantined
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink2">
          Text written to instruct an automated reader was removed before any
          analysis ran. It influenced no priority, licence check, vendor or draft
          below.
        </p>
        <ul className="mt-3 space-y-2">
          {items.map((t, i) => (
            <li
              key={i}
              className="rounded-lg border border-dangerLine/60 bg-surface/70 p-2.5 font-mono text-[11.5px] leading-relaxed text-ink3 line-through decoration-danger/50"
            >
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- identity */

/**
 * A drawn wordmark, not Belong's asset. The exercise forbids exposing real
 * Belong material, and every screen carries the simulation badge beside this.
 */
export function BelongWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-brand ${className}`}>
      <svg
        viewBox="0 0 26 24"
        aria-hidden
        className="h-[1.05em] w-auto shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.2 11.4 13 3.2l9.8 8.2v9.2a1.4 1.4 0 0 1-1.4 1.4H4.6a1.4 1.4 0 0 1-1.4-1.4Z" />
        <path d="M10.4 22v-5.4h5.2V22" />
      </svg>
      <span className="font-display text-[1.05em] font-semibold lowercase tracking-tight">
        belong
      </span>
    </span>
  );
}

/**
 * Shown on every screen. Honest about what this is, and it doubles as the
 * answer to "is that Belong's real data?" — it is not, and none of it is.
 */
export function SimulationBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-surface2 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink3 ${className}`}
      title="A case study artifact. Every Home, Resident, employee, vendor, cost and event is fictional."
    >
      <span className="h-1.5 w-1.5 rounded-full bg-terracotta" aria-hidden />
      Case simulation — all data fictional
    </span>
  );
}

/* --------------------------------------------------------------- feedback */

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <Card className="p-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && (
        <div className="mx-auto mt-2 max-w-prose text-[14px] leading-relaxed text-ink2">
          {children}
        </div>
      )}
    </Card>
  );
}

/**
 * Used wherever the engine could not determine something. It names what is
 * missing rather than guessing — the product never presents a guess as a fact.
 */
export function Undetermined({ what }: { what: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] italic text-ink3">
      <span className="h-1 w-1 rounded-full bg-ink3" aria-hidden />
      Not determined — {what}
    </span>
  );
}

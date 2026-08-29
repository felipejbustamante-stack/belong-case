"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Conflict, MatchConfidence } from "@/lib/domain/types";
import { Button, Label, Pill, severityTone } from "@/components/ui";

/**
 * The two ways a message leaves the inbox, both of them human decisions.
 *
 * Nothing commits itself. The engine has already worked out which open case
 * this resembles and what opening a new one would break; a person reads that
 * and chooses. That boundary is the governance model, not a missing feature.
 */
export function CommitActions({
  intakeId,
  matchCaseId,
  matchIssue,
  confidence,
  impact,
  committedTo,
}: {
  intakeId: string;
  matchCaseId: string | null;
  matchIssue: string | null;
  confidence: MatchConfidence;
  impact: Conflict[];
  committedTo?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"attach" | "open" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (committedTo) {
    return (
      <div className="flex flex-wrap items-center gap-3 border-t border-line bg-brandWash px-5 py-3.5">
        <Pill tone="brand">Committed</Pill>
        <span className="text-[13px] text-ink2">
          This message is recorded on{" "}
          <code className="font-mono text-[12.5px] font-semibold">{committedTo}</code>.
        </span>
        <Link
          href={`/ops/board?q=${encodeURIComponent(committedTo)}`}
          className="ml-auto text-[13px] font-semibold text-brand hover:underline"
        >
          Open it on the board →
        </Link>
      </div>
    );
  }

  const strongMatch = confidence === "confirmed" || confidence === "strong";

  async function commit(action: "attach" | "open") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeId,
          action,
          caseId: action === "attach" ? matchCaseId : undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "The case could not be committed.");
      setPending(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The case could not be committed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-line bg-surface2 px-5 py-4">
      {!pending ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[12.5px] text-ink3">
            Nothing reaches the board without a person putting it there.
          </span>
          <div className="ml-auto flex flex-wrap gap-2.5">
            {matchCaseId && (
              <Button
                variant={strongMatch ? "primary" : "secondary"}
                size="sm"
                onClick={() => setPending("attach")}
              >
                Log as an update to {matchCaseId}
              </Button>
            )}
            <Button
              variant={strongMatch ? "secondary" : "primary"}
              size="sm"
              onClick={() => setPending("open")}
            >
              Open a new case
            </Button>
          </div>
        </div>
      ) : pending === "attach" ? (
        <div>
          <Label>Log as an update to {matchCaseId}</Label>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink2">
            This message becomes an update on{" "}
            <code className="font-mono text-[12.5px] font-semibold">{matchCaseId}</code>
            {matchIssue ? ` — ${matchIssue}` : ""}. One case, not two: the same
            issue arriving through a second channel is exactly how the inherited
            queue ended up tracking one ceiling stain twice. The Resident is told
            both reports are now a single case, so the second one does not read
            as ignored.
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Button variant="primary" size="sm" disabled={busy} onClick={() => commit("attach")}>
              {busy ? "Recording…" : `Confirm — log onto ${matchCaseId}`}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Label>Open a new case</Label>
          {impact.length > 0 ? (
            <>
              <p className="mt-1.5 text-[13.5px] text-ink2">
                Committing this will break the following. The board reports it; it
                does not re-plan around it.
              </p>
              <ul className="mt-2.5 space-y-2">
                {impact.map((c, i) => (
                  <li key={i} className="flex flex-wrap items-start gap-2.5">
                    <Pill tone={severityTone(c.severity)}>{c.kind}</Pill>
                    <span className="min-w-[16rem] flex-1 text-[13px] leading-relaxed text-ink2">
                      {c.text}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1.5 text-[13.5px] text-ink2">
              Committing this breaks nothing currently on the board.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Button variant="primary" size="sm" disabled={busy} onClick={() => commit("open")}>
              {busy ? "Opening…" : "Confirm — open the case"}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-dangerLine bg-dangerBg p-3 text-[13px] text-ink2">
          {error}
        </p>
      )}
    </div>
  );
}

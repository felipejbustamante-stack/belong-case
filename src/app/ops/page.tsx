import Link from "next/link";
import { listIntake, listCases } from "@/lib/store";
import { triage } from "@/lib/triage/engine";
import { candidateImpact } from "@/lib/triage/conflicts";
import { TriageDetail } from "@/components/TriageDetail";
import { CommitActions } from "./CommitActions";
import {
  Card,
  EmptyState,
  Label,
  Pill,
  QuarantineNotice,
  RuleRef,
  Undetermined,
  priorityTone,
  severityTone,
} from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * The inbox. Every message is triaged on read, and the operator sees the
 * structured work order beside the original text — never instead of it.
 *
 * Nothing here writes to the board. Committing a case is a human action, and
 * that boundary is the governance model rather than a missing feature.
 */
export default function OpsInbox() {
  const intake = listIntake();
  const cases = listCases();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Label>Intake</Label>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight">
            Inbox
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink2">
            Messages as they arrived, each triaged on read. The engine
            classifies and recommends; a person commits.
          </p>
        </div>
        <p className="text-[13px] text-ink3">
          {intake.length} message{intake.length === 1 ? "" : "s"}
        </p>
      </header>

      {!intake.length ? (
        <EmptyState title="Nothing in the inbox yet">
          Submit something from the{" "}
          <Link href="/resident" className="font-semibold text-brand hover:underline">
            Resident view
          </Link>{" "}
          and it appears here, triaged against the open queue.
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {intake.map((entry) => {
            const r = triage(entry.body, entry.homeId ?? null);
            const impact = candidateImpact(
              cases,
              r,
              r.match.top?.queueCase.id ?? null,
            );

            return (
              <Card
                as="article"
                key={entry.id}
                className={`animate-rise overflow-hidden ${
                  entry.committedTo ? "opacity-80" : ""
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface2 px-5 py-3">
                  <Pill tone={priorityTone(r.priority.level)} className="text-[12.5px]">
                    {r.priority.level}
                  </Pill>
                  <code className="font-mono text-[12.5px] font-semibold">
                    {entry.id}
                  </code>
                  <span className="text-[12.5px] text-ink3">
                    {entry.channel} ·{" "}
                    {new Date(entry.receivedAt).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  <span className="ml-auto text-[12.5px] text-ink3">
                    {r.home
                      ? `${r.home.id} · ${r.home.stage} · ${r.homeSource}`
                      : "Home not identified"}
                  </span>
                </div>

                <div className="grid gap-6 p-5 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <Label>As it arrived</Label>
                      <blockquote className="mt-2 rounded-xl border border-line bg-sunken p-4 text-[14px] italic leading-relaxed text-ink2">
                        {entry.body}
                      </blockquote>
                    </div>
                    <QuarantineNotice items={r.quarantined} />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Priority</Label>
                      <div className="mt-1.5">
                        <RuleRef
                          id={r.priority.rule.id}
                          label={r.priority.rule.label}
                          clause={r.priority.policy}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Trade</Label>
                        <p className="mt-1 text-[13.5px] text-ink2">
                          {r.trade ? (
                            <>
                              {r.trade.trade.label}
                              {r.trade.trade.licensed && (
                                <Pill tone="danger" className="ml-2">
                                  Licence required
                                </Pill>
                              )}
                            </>
                          ) : (
                            <Undetermined what="no trade named in the message" />
                          )}
                        </p>
                      </div>
                      <div>
                        <Label>Match</Label>
                        <p className="mt-1 text-[13.5px] text-ink2">
                          {r.match.top
                            ? `${r.match.top.queueCase.id} · ${r.match.confidence}`
                            : "No open case — this is new"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label>Containment now</Label>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-ink2">
                        {r.containment[0]}
                      </p>
                    </div>

                    <div>
                      <Label>Next operating action</Label>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-ink2">
                        {r.nextActions[0]}
                      </p>
                    </div>

                    {impact.length > 0 && (
                      <div className="rounded-xl border border-line bg-surface2 p-3.5">
                        <Label>Committing this would break</Label>
                        <ul className="mt-2 space-y-1.5">
                          {impact.slice(0, 3).map((c, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Pill tone={severityTone(c.severity)}>{c.kind}</Pill>
                              <span className="flex-1 text-[12.5px] leading-relaxed text-ink2">
                                {c.text}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <details className="border-t border-line">
                  <summary className="cursor-pointer px-5 py-3 text-[13px] font-semibold text-brand hover:bg-surface2">
                    Full work order
                  </summary>
                  <div className="border-t border-line2 bg-surface2/50 p-5">
                    <TriageDetail r={r} showQuarantine={false} />
                  </div>
                </details>

                <CommitActions
                  intakeId={entry.id}
                  matchCaseId={r.match.top?.queueCase.id ?? null}
                  matchIssue={r.match.top?.queueCase.issue ?? null}
                  confidence={r.match.confidence}
                  impact={impact}
                  committedTo={entry.committedTo}
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

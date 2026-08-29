import { listIntake, listCases } from "@/lib/store";
import { triage } from "@/lib/triage/engine";
import { candidateImpact } from "@/lib/triage/conflicts";

export const dynamic = "force-dynamic";

/**
 * The inbox. Every message that arrives is triaged on read — the operator sees
 * the structured work order beside the original text, never instead of it.
 *
 * Nothing here writes to the board. Committing a case is a human action, and
 * that boundary is the whole governance model: the engine classifies and
 * recommends, a person decides.
 */
export default function OpsInbox() {
  const intake = listIntake();
  const cases = listCases();

  if (!intake.length) {
    return (
      <div className="border border-line bg-surface p-12 text-center">
        <p className="text-[15px] text-ink3">
          Nothing in the inbox yet. Submit something from the Resident view and it
          appears here, triaged.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="font-cond text-2xl font-bold">Inbox</h1>
      {intake.map((entry) => {
        const r = triage(entry.body, entry.homeId ?? null);
        const impact = candidateImpact(cases, r, r.match.top?.queueCase.id ?? null);
        const tone =
          r.priority.level === "P0" ? "border-dangerLine bg-dangerBg text-danger"
          : r.priority.level === "P1" ? "border-warnLine bg-warnBg text-warn"
          : "border-goodLine bg-goodBg text-good";

        return (
          <article key={entry.id} className="border border-line bg-surface">
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
              <span className={`border px-3 py-1 font-cond text-[13px] font-bold ${tone}`}>
                {r.priority.level}
              </span>
              <span className="font-mono text-[13px] font-semibold">{entry.id}</span>
              <span className="text-[12.5px] text-ink3">
                {entry.channel} · {new Date(entry.receivedAt).toLocaleString()}
              </span>
              <span className="ml-auto text-[12.5px] text-ink3">
                {r.home ? `${r.home.id} · ${r.home.stage}` : "Home not identified"}
              </span>
            </div>

            <div className="grid gap-6 p-5 lg:grid-cols-2">
              <div>
                <p className="label">As it arrived</p>
                <blockquote className="mt-2 border border-line bg-sunken p-3 text-[14px] italic leading-relaxed text-ink2">
                  {entry.body}
                </blockquote>

                {r.quarantined.length > 0 && (
                  <div className="mt-3 border-l-4 border-danger bg-dangerBg p-3">
                    <p className="font-cond text-[11px] font-bold uppercase tracking-wider text-danger">
                      {r.quarantined.length} embedded instruction quarantined
                    </p>
                    <p className="mt-1 text-[13px] text-ink2">
                      Text written to instruct an automated reader was removed before
                      any analysis ran. It influenced nothing below.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3 text-[14px] text-ink2">
                <p>
                  <span className="label mr-2">Rule</span>
                  {r.priority.rule.id} — {r.priority.rule.label}
                </p>
                <p>
                  <span className="label mr-2">Trade</span>
                  {r.trade?.trade.label ?? "Undetermined"} · {r.resource}
                </p>
                <p>
                  <span className="label mr-2">Match</span>
                  {r.match.top
                    ? `${r.match.top.queueCase.id} (${r.match.confidence})`
                    : "No open case — this is new"}
                </p>
                <div>
                  <p className="label">Containment</p>
                  <p className="mt-1">{r.containment[0]}</p>
                </div>
                <div>
                  <p className="label">Next action</p>
                  <p className="mt-1">{r.nextActions[0]}</p>
                </div>
                {impact.length > 0 && (
                  <div className="border-t border-line2 pt-3">
                    <p className="label">Committing this would break</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px]">
                      {impact.slice(0, 3).map((c, i) => (
                        <li key={i}>{c.text}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

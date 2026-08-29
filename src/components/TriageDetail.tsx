import type { TriageResult } from "@/lib/domain/types";
import { ZONE } from "@/lib/domain/types";
import {
  Card,
  Label,
  Pill,
  QuarantineNotice,
  RuleRef,
  Undetermined,
  priorityTone,
  severityTone,
} from "@/components/ui";

/**
 * One work order, rendered whole.
 *
 * The ordering is the operating order, not a data dump: what it is, how urgent
 * and under which clause, what stops the harm now, whether anyone can actually
 * get in, what is still unknown, who may approve the spend, who is qualified to
 * do it, and what to say. Containment sits above repair everywhere because
 * containment is never resolution.
 */

function Section({
  title,
  children,
  note,
}: {
  title: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <div>
      <Label>{title}</Label>
      {note && <p className="mt-1 text-[11.5px] italic text-ink3">{note}</p>}
      <div className="mt-2 text-[13.5px] leading-relaxed text-ink2">{children}</div>
    </div>
  );
}

function KeyValues({ rows }: { rows: { key: string; value: string }[] }) {
  return (
    <dl className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap gap-x-2">
          <dt
            className={`shrink-0 text-[11.5px] font-semibold uppercase tracking-wider ${
              r.key === "BLOCKER" ? "text-danger" : "text-ink3"
            }`}
          >
            {r.key}
          </dt>
          <dd className="min-w-[12rem] flex-1 text-[13.5px] text-ink2">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TriageDetail({
  r,
  showQuarantine = true,
}: {
  r: TriageResult;
  /** Off where the surrounding screen already shows the quarantine notice. */
  showQuarantine?: boolean;
}) {
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div className="space-y-5">
      {showQuarantine && <QuarantineNotice items={r.quarantined} />}

      {r.messageType.key !== "request" && (
        <div className="rounded-xl border border-warnLine bg-warnBg p-4">
          <p className="text-[13px] font-semibold text-warn">{r.messageType.label}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink2">
            {r.messageType.note}
          </p>
        </div>
      )}

      {/* what it is, and under which clause */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Pill tone={priorityTone(r.priority.level)} className="text-[13px]">
            {r.priority.level}
          </Pill>
          <span className="text-[13px] text-ink2">
            Acknowledge within {r.priority.ackMinutes} minutes
            {r.priority.arriveHours
              ? ` · qualified arrival within ${r.priority.arriveHours} hours`
              : " · schedule within 2 business days"}
          </span>
          {r.priority.contained && (
            <Pill tone="good">Contained — not resolved</Pill>
          )}
        </div>
        <div className="mt-3">
          <RuleRef
            id={r.priority.rule.id}
            label={r.priority.rule.label}
            clause={r.priority.policy}
          />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Trade and resource">
          {r.trade ? (
            <>
              <p>
                <span className="font-semibold text-ink">{r.trade.trade.label}</span>
                {r.trade.trade.licensed && (
                  <Pill tone="danger" className="ml-2">
                    Licence required
                  </Pill>
                )}
              </p>
              <p className="mt-1.5">{r.resource}</p>
              <p className="mt-1.5 text-[12.5px] text-ink3">
                Evidence: {r.trade.evidence.join(", ")}
                {r.trade.alternatives.length > 0 && (
                  <>
                    {" · also present: "}
                    {r.trade.alternatives.map((a) => a.trade.label).join(", ")}
                  </>
                )}
              </p>
            </>
          ) : (
            <Undetermined what="the description does not name a trade. A coordinator must clarify before any vendor is assigned." />
          )}
          <p className="mt-2 text-[12.5px] text-ink3">
            Workstream: {r.workstream}
          </p>
        </Section>

        <Section
          title="Match against the open queue"
          note="Only the issue wording anchors a match — a Home we manage can have a brand-new problem."
        >
          {r.match.top ? (
            <>
              <p>
                <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[12px] font-semibold">
                  {r.match.top.queueCase.id}
                </code>
                <Pill
                  tone={
                    r.match.confidence === "confirmed"
                      ? "good"
                      : r.match.confidence === "strong"
                        ? "warn"
                        : "neutral"
                  }
                  className="ml-2"
                >
                  {r.match.confidence}
                </Pill>
              </p>
              <p className="mt-1.5">{r.match.top.queueCase.issue}</p>
              <ul className="mt-2 space-y-1 text-[12.5px] text-ink3">
                {r.match.top.evidence.map((e, i) => (
                  <li key={i}>· {e}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>
              No open case matches this wording — treat it as new.
              {r.match.zoneHit && (
                <> Zone named: {ZONE[r.match.zoneHit]}.</>
              )}
            </p>
          )}
        </Section>
      </div>

      <Section
        title="Containment now"
        note="Stopping the harm and fixing the fault are separate states. Containment never closes a case."
      >
        <ul className="space-y-2">
          {r.containment.map((c, i) => (
            <li key={i} className="rounded-lg border border-line bg-surface2 p-3">
              {c}
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Access plan">
          <KeyValues rows={r.accessPlan} />
          {r.timings.length > 0 && (
            <p className="mt-2.5 text-[12.5px] text-ink3">
              Times stated in the message: {r.timings.join(" · ")}
            </p>
          )}
        </Section>

        <Section
          title="Missing facts"
          note="Named rather than guessed. The engine never presents an assumption as a fact."
        >
          <ul className="space-y-1.5">
            {r.missingFacts.map((m, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink3" aria-hidden />
                {m}
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Risk flags">
        <ul className="space-y-2">
          {r.flags.map((f, i) => (
            <li key={i} className="flex flex-wrap items-start gap-2.5">
              <Pill tone={severityTone(f.severity)}>{f.kind}</Pill>
              <span className="min-w-[14rem] flex-1">{f.text}</span>
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Approval route">
          <KeyValues rows={r.approval} />
        </Section>

        <Section
          title="Vendors"
          note="Ranked on first-visit resolution, never on price."
        >
          {r.vendors.warning && (
            <p className="mb-2 rounded-lg border border-warnLine bg-warnBg p-2.5 text-[12.5px] text-ink2">
              {r.vendors.warning}
            </p>
          )}
          {r.vendors.list.length > 0 ? (
            <ol className="space-y-2">
              {r.vendors.list.slice(0, 3).map((v, i) => (
                <li
                  key={v.name}
                  className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-lg border border-line bg-surface2 p-2.5"
                >
                  <span className="font-mono text-[11.5px] text-ink3">{i + 1}</span>
                  <span className="font-semibold text-ink">{v.name}</span>
                  <span className="text-[12.5px] text-ink3">
                    {pct(v.firstVisitResolution)} first-visit · {pct(v.onTime)} on
                    time · {v.capacity}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p>{r.vendors.message}</p>
          )}
          {r.vendors.excluded.length > 0 && (
            <details className="mt-2.5">
              <summary className="cursor-pointer text-[12.5px] font-semibold text-brand hover:underline">
                {r.vendors.excluded.length} excluded, and why
              </summary>
              <ul className="mt-2 space-y-1.5 text-[12.5px] text-ink3">
                {r.vendors.excluded.map((e, i) => (
                  <li key={i}>
                    <span className="font-semibold text-ink2">{e.name}</span> — {e.why}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Section>
      </div>

      <Section
        title="Drafted reply"
        note="Acknowledges and commits to a time. It never commits money or an outcome without authority."
      >
        <div className="whitespace-pre-line rounded-lg border border-line bg-surface2 p-4 text-[13.5px] leading-relaxed">
          {r.communication.body}
        </div>
        <p className="mt-2 text-[12.5px] text-ink3">
          Acknowledge within {r.communication.ackWithin} · update{" "}
          {r.communication.updateEvery}
        </p>
      </Section>

      <Section title="Next operating action">
        <ol className="space-y-2">
          {r.nextActions.map((a, i) => (
            <li key={i} className="flex gap-3 rounded-lg border border-brandLine bg-brandWash p-3">
              <span className="font-mono text-[12px] font-semibold text-brand">
                {i + 1}
              </span>
              <span className="text-ink2">{a}</span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

import Link from "next/link";
import { listCases } from "@/lib/store";
import { standingConflicts } from "@/lib/triage/conflicts";
import { toView, isOpen } from "@/lib/ops/board";
import { earliestTime, byEarliestTime } from "@/lib/ops/schedule";
import { COORDINATOR_CAPACITY, IMMOVABLE_COMMITMENTS } from "@/lib/domain/policy";
import {
  Card,
  EmptyState,
  Label,
  Pill,
  RagDot,
  priorityTone,
  severityTone,
} from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * One coordinator's day. This is what turns the board from something watched
 * into something worked.
 *
 * Over-capacity is read from the conflict engine rather than recomputed here.
 * Two places counting the same thing eventually disagree, and the moment they
 * do, nobody trusts either.
 */
export default async function MyCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ who?: string }>;
}) {
  const { who } = await searchParams;
  const cases = listCases();
  const conflicts = standingConflicts(cases);

  const holders = Array.from(new Set(cases.filter(isOpen).map((c) => c.owner))).sort();
  const people = Array.from(new Set([...Object.keys(COORDINATOR_CAPACITY), ...holders]));

  const selected = who && people.includes(who) ? who : (people[0] ?? "");
  const mine = cases.filter((c) => c.owner === selected);
  const open = mine.filter(isOpen);
  const capacity = COORDINATOR_CAPACITY[selected];

  // The findings the conflict engine already raised about this person.
  const theirs = conflicts.filter(
    (c) =>
      c.text.startsWith(selected) ||
      c.caseIds.some((id) => open.some((o) => o.id === id)),
  );

  const day = byEarliestTime(open, (c) => c.action).map((c) => ({
    view: toView(c),
    at: earliestTime(c.action),
  }));

  const fixed = IMMOVABLE_COMMITMENTS.filter((i) => i.who === selected);

  const load = capacity ? Math.min(open.length / capacity, 1) : 0;
  const loadTone =
    !capacity ? "neutral" : open.length > capacity ? "danger" : open.length === capacity ? "warn" : "good";

  return (
    <div className="space-y-5">
      <header>
        <Label>Coordinator view</Label>
        <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight">
          My cases
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink2">
          One person&rsquo;s open work, their load against practical capacity, and
          today in the order it happens.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {people.map((p) => {
          const count = cases.filter((c) => c.owner === p && isOpen(c)).length;
          return (
            <Link
              key={p}
              href={`/ops/me?who=${encodeURIComponent(p)}`}
              aria-current={p === selected ? "page" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
                p === selected
                  ? "border-brand bg-brand text-brandInk"
                  : "border-line bg-surface text-ink2 hover:border-brand hover:text-brand"
              }`}
            >
              {p}
              <span className={p === selected ? "opacity-80" : "text-ink3"}> · {count}</span>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-5">
          <Label>Load</Label>
          <p className="mt-2 font-display text-3xl font-semibold">
            {open.length}
            <span className="text-[18px] font-normal text-ink3">
              {capacity ? ` of ${capacity}` : " open"}
            </span>
          </p>

          {capacity ? (
            <>
              <div
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sunken"
                role="img"
                aria-label={`${open.length} open cases against a practical capacity of ${capacity}`}
              >
                <div
                  className={`h-full rounded-full ${
                    loadTone === "danger" ? "bg-danger" : loadTone === "warn" ? "bg-warn" : "bg-good"
                  }`}
                  style={{ width: `${Math.max(load * 100, 4)}%` }}
                />
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-ink2">
                {open.length > capacity
                  ? `Over practical capacity by ${open.length - capacity}. The overflow will slip unless it is reassigned — decide which, rather than discovering it.`
                  : open.length === capacity
                    ? "At practical capacity. Anything further has to go to someone else."
                    : `Room for ${capacity - open.length} more.`}
              </p>
            </>
          ) : (
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink2">
              No practical case capacity is recorded for this person in Team &amp;
              Capacity — they are a lead or a field resource rather than a
              case-carrying coordinator.
            </p>
          )}

          {open.length > 0 && (
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
              {(["RED", "AMBER", "GREEN"] as const).map((r) => {
                const n = open.filter((c) => c.risk === r).length;
                return (
                  <div key={r}>
                    <dt className="flex items-center gap-1.5">
                      <RagDot risk={r} />
                      <span className="text-[11.5px] font-semibold uppercase tracking-wider text-ink3">
                        {r}
                      </span>
                    </dt>
                    <dd className="mt-0.5 font-display text-xl font-semibold">{n}</dd>
                  </div>
                );
              })}
            </dl>
          )}

          {open.some((c) => toView(c).blockedDispatch) && (
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink2">
              {open.filter((c) => toView(c).blockedDispatch).length} of these
              cannot be dispatched yet — a condition on the access gate is still
              unmet.
            </p>
          )}

          {fixed.length > 0 && (
            <div className="mt-4 rounded-lg border border-dangerLine bg-dangerBg p-3">
              <Label>Immovable today</Label>
              {fixed.map((f) => (
                <p key={f.caseId} className="mt-1 text-[12.5px] leading-relaxed text-ink2">
                  <span className="font-semibold">{f.when}</span> — {f.caseId} ({f.zone}).{" "}
                  {f.why}
                </p>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <Label>What the board says about this load</Label>
          {theirs.length ? (
            <ul className="mt-2.5 space-y-2.5">
              {theirs.map((c, i) => (
                <li key={i} className="flex flex-wrap items-start gap-2.5">
                  <Pill tone={severityTone(c.severity)}>{c.kind}</Pill>
                  <span className="min-w-[14rem] flex-1 text-[13px] leading-relaxed text-ink2">
                    {c.text}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13.5px] text-ink2">
              Nothing on this person&rsquo;s work is currently flagged.
            </p>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
          <Label>Today, in the order it happens</Label>
          <span className="text-[12.5px] text-ink3">
            Times read from each case&rsquo;s next action
          </span>
        </div>

        {day.length === 0 ? (
          <p className="p-6 text-center text-[14px] text-ink2">
            No open cases for {selected}.
          </p>
        ) : (
          <ul className="divide-y divide-line2">
            {day.map(({ view: c, at }) => (
              <li key={c.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-4">
                <span className="w-14 shrink-0 font-mono text-[13px] font-semibold">
                  {at ? at.label : <span className="text-ink3">—</span>}
                </span>
                <div className="min-w-[16rem] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <RagDot risk={c.risk} />
                    <Link
                      href={`/ops/board?q=${encodeURIComponent(c.id)}`}
                      className="font-mono text-[13px] font-semibold hover:text-brand hover:underline"
                    >
                      {c.id}
                    </Link>
                    <Pill tone={priorityTone(c.priority)}>{c.priority}</Pill>
                    {c.blockedDispatch && <Pill tone="warn">Dispatch blocked</Pill>}
                    <span className="font-mono text-[12px] text-ink3">
                      {c.homeId} · {c.zoneName}
                    </span>
                  </div>
                  <p className="mt-1 text-[13.5px] font-medium">{c.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink2">{c.action}</p>
                  {!at && (
                    <p className="mt-1 text-[12.5px] italic text-ink3">
                      No time stated in the next action — it cannot be sequenced
                      against the rest of the day until one is set.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {mine.length > open.length && (
        <EmptyState title={`${mine.length - open.length} closed or verified`}>
          Not shown above. Switch the board to &ldquo;including closed&rdquo; to see
          them.
        </EmptyState>
      )}
    </div>
  );
}

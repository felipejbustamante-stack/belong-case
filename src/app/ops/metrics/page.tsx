import Link from "next/link";
import { listCases } from "@/lib/store";
import { metrics, NOT_MEASURED } from "@/lib/ops/metrics";
import { Card, Label, Pill } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Seven measures, plus the two that are deliberately absent.
 *
 * A tile either carries a number computed from something the system records,
 * or it says which event is missing and why a figure would be invented. The
 * empty tiles are not a gap in the screen; they are the instrumentation
 * backlog, stated where the people who need it will see it.
 */
export default function MetricsPage() {
  const cases = listCases();
  const rows = metrics(cases);
  const measured = rows.filter((m) => m.value !== null).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Label>How the operation is run</Label>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight">
            Metrics
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink2">
            Each measure is computed from something the system genuinely records,
            or it names the event that is missing. None of them is estimated to
            fill a tile.
          </p>
        </div>
        <Pill tone="neutral">
          {measured} of {rows.length} measurable today
        </Pill>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((m) => (
          <Card key={m.id} className="flex flex-col p-5">
            <div className="flex flex-wrap items-start gap-2.5">
              <h2 className="flex-1 font-display text-[17px] font-semibold leading-snug">
                {m.name}
              </h2>
              {m.value === null && <Pill tone="warn">Not yet recorded</Pill>}
            </div>

            {m.value !== null && (
              <p className="mt-2 font-display text-[34px] font-semibold leading-none text-brand">
                {m.value}
              </p>
            )}

            <p className="mt-2.5 text-[13px] leading-relaxed text-ink2">{m.detail}</p>

            {m.leading && (
              <div className="mt-3 rounded-lg border border-line bg-surface2 p-3">
                <Label>{m.leading.label}</Label>
                <p className="mt-1 font-display text-xl font-semibold">
                  {m.leading.value}
                </p>
                {m.leading.note && (
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink2">
                    {m.leading.note}
                  </p>
                )}
              </div>
            )}

            <p className="mt-3 border-l-2 border-brandLine pl-3 text-[12.5px] leading-relaxed text-ink3">
              {m.why}
            </p>

            {m.caseIds && m.caseIds.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11.5px] font-semibold uppercase tracking-wider text-ink3">
                  Behind this
                </span>
                {m.caseIds.map((id) => (
                  <Link
                    key={id}
                    href={`/ops/board?q=${encodeURIComponent(id)}`}
                    className="rounded border border-line bg-surface2 px-1.5 py-0.5 font-mono text-[11.5px] text-ink2 transition hover:border-brand hover:text-brand"
                  >
                    {id}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <Label>Deliberately not measured</Label>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink2">
          Both of these improve by doing the wrong thing, so neither is on the
          board.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {NOT_MEASURED.map((n) => (
            <div key={n.name}>
              <dt className="text-[13.5px] font-semibold line-through decoration-danger/60">
                {n.name}
              </dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-ink2">{n.why}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}

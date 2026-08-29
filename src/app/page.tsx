import Link from "next/link";
import { HOMES } from "@/lib/domain/homes";
import { VENDORS } from "@/lib/domain/vendors";
import { SEED_CASES } from "@/lib/domain/cases";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  BelongWordmark,
  ButtonLink,
  Card,
  Label,
  SimulationBadge,
} from "@/components/ui";

/**
 * The demo hub. Whoever opens this product cold — an interviewer, a reviewer —
 * lands here, and has to understand in one screen what the artifact does and
 * where the two surfaces are. Counts come from the domain model rather than
 * from copy, so they cannot drift away from the data.
 */

const WHAT_IT_DOES = [
  {
    title: "Structures the intake",
    body: "A message in a Resident's own words becomes a work order: Home, trade, priority, containment, access plan, missing facts, approval route, ranked vendors and a drafted reply.",
  },
  {
    title: "Recommends with its reasons attached",
    body: "Every priority cites the rule that fired and the policy clause it rests on. Every excluded vendor names why it was excluded. Nothing arrives as an unexplained verdict.",
  },
  {
    title: "Reports what a change would break",
    body: "Before a case is committed it says what it costs the rest of the board — a vendor already at capacity, a piece of equipment another case is holding, a Home that hands over in two days. It does not re-plan the week.",
  },
];

const FAILURES = [
  {
    failure:
      "Nothing checked whether a visit was executable before it was booked — a vendor window against a Resident who was not home, a visit to a building that had already refused entry.",
    closes: "the access gate",
  },
  {
    failure:
      "Nothing de-duplicated at intake. The same ceiling stain arrived through the app and by phone and became two cases.",
    closes: "case matching at intake",
  },
  {
    failure:
      "No one owned final verification. Three committed move-ins had no named person to confirm the work was actually done.",
    closes: "a named verification owner",
  },
];

export default function Home() {
  const openCases = SEED_CASES.length;

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-shell flex-wrap items-center gap-4 px-6 py-3">
          <BelongWordmark className="text-[17px]" />
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink3">
            Field Operations
          </span>
          <div className="ml-auto flex items-center gap-3">
            <SimulationBadge className="hidden sm:inline-flex" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-shell px-6 pb-20 pt-14">
        <section className="grid items-start gap-10 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <Label>A working operational artifact</Label>
            <h1 className="mt-3 font-display text-[40px] font-semibold leading-[1.1] tracking-tight sm:text-[48px]">
              Intake becomes a work order.
              <br />
              <span className="text-brand">A person still decides.</span>
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-ink2">
              A synthetic South Florida market: {openCases} open cases at Monday
              08:00, {HOMES.length} Homes and a network of {VENDORS.length}{" "}
              vendors, across a 72-hour planning window. A Resident writes what is
              wrong. The same deterministic engine the operations team works from
              reads it, matches it against the open queue, grades it against the
              policy, and says what committing it would break.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ButtonLink href="/resident" variant="primary" size="lg">
                Report a problem
              </ButtonLink>
              <ButtonLink href="/ops" size="lg">
                Open the back office
              </ButtonLink>
            </div>
          </div>

          <Card className="p-6">
            <Label>What it exists to prevent</Label>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink2">
              The inherited queue did not fail {openCases} times. It failed three
              structural ways, and every feature here closes one of them.
            </p>
            <ol className="mt-4 space-y-4">
              {FAILURES.map((f, i) => (
                <li key={f.closes} className="flex gap-3">
                  <span className="mt-0.5 font-mono text-[12px] font-semibold text-terracotta">
                    0{i + 1}
                  </span>
                  <div>
                    <p className="text-[13.5px] leading-relaxed text-ink2">{f.failure}</p>
                    <p className="mt-1 text-[12.5px] font-semibold text-brand">
                      → {f.closes}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {WHAT_IT_DOES.map((w, i) => (
            <Card key={w.title} className="p-6">
              <span className="font-mono text-[12px] font-semibold text-brand">
                0{i + 1}
              </span>
              <h2 className="mt-2 font-display text-[19px] font-semibold leading-snug">
                {w.title}
              </h2>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink2">{w.body}</p>
            </Card>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <Link href="/resident" className="group block">
            <Card className="h-full p-7 transition group-hover:border-brand group-hover:shadow-lift">
              <Label>Resident</Label>
              <h2 className="mt-2 font-display text-2xl font-semibold">
                The intake surface
              </h2>
              <p className="mt-2.5 text-[14px] leading-relaxed text-ink2">
                Where a Resident reports a problem, across the channels they
                actually use — app, text, email, a transcribed phone call. They do
                not categorise it, rank it, or name a trade. That is the
                operation&rsquo;s job.
              </p>
              <span className="mt-4 inline-block text-[13px] font-semibold text-brand">
                Report something →
              </span>
            </Card>
          </Link>

          <Link href="/ops" className="group block">
            <Card className="h-full p-7 transition group-hover:border-brand group-hover:shadow-lift">
              <Label>Operations</Label>
              <h2 className="mt-2 font-display text-2xl font-semibold">
                The back office
              </h2>
              <p className="mt-2.5 text-[14px] leading-relaxed text-ink2">
                Inbox and triage, the case board with the risks to the plan,
                per-coordinator load, and the metrics. Every message is triaged on
                arrival; nothing reaches the board without a person putting it
                there.
              </p>
              <span className="mt-4 inline-block text-[13px] font-semibold text-brand">
                Open operations →
              </span>
            </Card>
          </Link>
        </section>

        <section className="mt-6">
          <Card className="flex flex-wrap items-center gap-x-8 gap-y-4 p-7">
            <div className="max-w-xl">
              <Label>The decision behind the engine</Label>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink2">
                There is no language model in the triage path. The source data
                carried five instructions written to be obeyed by an automated
                reader, and three of them pointed at the three most expensive
                errors available in the queue. The engine quarantines that text
                before it analyses anything — and shows the operator what it
                removed.
              </p>
            </div>
            <ButtonLink href="/about" className="ml-auto">
              Where AI acts, recommends, and must not decide
            </ButtonLink>
          </Card>
        </section>

        <footer className="mt-14 flex flex-wrap items-center gap-4 border-t border-line pt-6 text-[12.5px] text-ink3">
          <SimulationBadge />
          <span>
            Every Home, Resident, employee, vendor, cost and event here is
            fictional.
          </span>
        </footer>
      </main>
    </div>
  );
}

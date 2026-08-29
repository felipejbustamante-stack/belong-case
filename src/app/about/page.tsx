import Link from "next/link";
import {
  CONTAINMENT_AUTHORITY,
  MOVE_IN_EXCEPTION_CEILING,
} from "@/lib/domain/policy";
import { LICENSED_TRADES } from "@/lib/domain/types";
import { TRADES } from "@/lib/domain/policy";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  BelongWordmark,
  ButtonLink,
  Card,
  Label,
  SimulationBadge,
} from "@/components/ui";

/**
 * The governance page: where AI acts, where it only recommends, and where a
 * human must approve. It is the last screen of the demo, and it is the honest
 * answer to "you were told to use AI — where is it?".
 *
 * Money figures and the licensed-trade list are read from the domain model so
 * this page cannot drift away from the rules the engine actually enforces.
 */

const ACTS = [
  "Structure the intake and extract Home, trade, access window, COI and deadlines",
  "Match against the open queue; flag duplicates and repeat repairs",
  "Quarantine instructions embedded in third-party text",
  "Filter vendors by licence, zone and capacity",
  "Start the SLA clock",
  "Flag conflicts against the live board",
];

const RECOMMENDS = [
  "The priority level, and the policy clause it rests on",
  "The vendor ranking",
  "The containment measure",
  "The drafted Resident, Homeowner or vendor message",
  "The next operating action",
];

const APPROVES = [
  "Committing anything to the board",
  "Any dispatch to an occupied Home",
  "Any spend above the Home limit",
  "Every signed-move-in exception",
  "Any change to a commitment already made",
  "Anything sent to a Resident or Homeowner",
];

const CONTROLS = [
  "Human confirmation on every dispatch and every outbound message.",
  "An append-only log of the rule that fired, the input it fired on, and who approved the outcome.",
  "Vendor and third-party free text treated as untrusted by default.",
  "A weekly review of P0 and P1 classifications against what actually happened, used to tune the rules.",
  "No interface path — none, not even an override — to assign an unlicensed vendor to licensed work.",
];

export default function AboutPage() {
  const licensed = TRADES.filter((t) => LICENSED_TRADES.includes(t.key)).map(
    (t) => t.label,
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-shell flex-wrap items-center gap-4 px-6 py-3">
          <Link href="/" className="flex items-baseline gap-2.5">
            <BelongWordmark className="text-[17px]" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink3">
              Field Operations
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <SimulationBadge className="hidden sm:inline-flex" />
            <ThemeToggle />
            <ButtonLink href="/ops" size="sm">
              Back office
            </ButtonLink>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-20 pt-12">
        <Label>AI governance</Label>
        <h1 className="mt-3 font-display text-[36px] font-semibold leading-tight tracking-tight">
          Where AI acts, where it recommends, and where a human must approve
        </h1>

        <Card className="mt-7 p-7">
          <h2 className="font-display text-xl font-semibold">
            Why there is no language model in the decision path
          </h2>
          <div className="mt-3 space-y-3 text-[14.5px] leading-relaxed text-ink2">
            <p>
              The source data contained five instructions written to be obeyed by
              an automated reader — embedded in vendor notes, a quote footer, a
              building auto-reply, a Resident web-form paste and an archived
              sheet. Three of them pointed at the three most expensive errors
              available in the queue: keeping an unlicensed vendor on an
              electrical emergency, approving an undiagnosed five-figure
              replacement, and recording access as confirmed when the building
              had refused it.
            </p>
            <p>
              A model reading vendor-supplied free text is exactly the surface
              those instructions attack. So the runtime is deterministic and
              inspectable, and every output traces to a rule id. AI did the
              design work — deriving the rules from the policy sheets, building
              the classifier, drafting the templates, and finding six
              classification bugs by running the engine against messages it had
              never seen. It does not make the calls.
            </p>
            <p className="border-l-2 border-brandLine pl-4 text-ink2">
              Added safely, AI belongs <em>outside</em> the decision path:
              polishing the tone of a drafted message before a human sends it, or
              summarising a long vendor thread for a coordinator. A person still
              reads and approves the result, and neither changes a priority, a
              licence status or a spend approval.
            </p>
          </div>
        </Card>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <Label>Acts automatically</Label>
            <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-ink2">
              {ACTS.map((a) => (
                <li key={a} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-good" aria-hidden />
                  {a}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <Label>Recommends only</Label>
            <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-ink2">
              {RECOMMENDS.map((a) => (
                <li key={a} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" aria-hidden />
                  {a}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <Label>A human must approve</Label>
            <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-ink2">
              {APPROVES.map((a) => (
                <li key={a} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" aria-hidden />
                  {a}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <Card className="mt-6 p-7">
          <h2 className="font-display text-xl font-semibold">
            The rules with no override path
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink2">
            These are policy, not preference. There is deliberately no admin
            flag, no force option and no interface route around any of them.
          </p>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-[13.5px] font-semibold">Licensed trades</dt>
              <dd className="mt-1 text-[13.5px] leading-relaxed text-ink2">
                {licensed.join(", ")} require a licensed and insured vendor. A
                Field Specialist or a generalist may never be assigned to one.
              </dd>
            </div>
            <div>
              <dt className="text-[13.5px] font-semibold">Spend authority</dt>
              <dd className="mt-1 text-[13.5px] leading-relaxed text-ink2">
                Within the Home limit: coordinator. Emergency containment to $
                {CONTAINMENT_AUTHORITY.toLocaleString()}: lead. Signed-move-in
                exception to ${MOVE_IN_EXCEPTION_CEILING.toLocaleString()}:
                manager. Above that: executive.
              </dd>
            </div>
            <div>
              <dt className="text-[13.5px] font-semibold">
                Containment is never resolution
              </dt>
              <dd className="mt-1 text-[13.5px] leading-relaxed text-ink2">
                Stopping the harm and fixing the fault are separate states. A case
                is not resolved because a portable AC arrived.
              </dd>
            </div>
            <div>
              <dt className="text-[13.5px] font-semibold">
                Vendor completion is never verification
              </dt>
              <dd className="mt-1 text-[13.5px] leading-relaxed text-ink2">
                A named Belong person confirms the work functionally. &ldquo;The
                vendor said it&rsquo;s done&rdquo; does not close a case.
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="mt-6 p-7">
          <h2 className="font-display text-xl font-semibold">
            Controls required before live use
          </h2>
          <ol className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-ink2">
            {CONTROLS.map((c, i) => (
              <li key={c} className="flex gap-3">
                <span className="font-mono text-[12px] font-semibold text-brand">
                  {i + 1}
                </span>
                {c}
              </li>
            ))}
          </ol>
        </Card>

        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/resident" variant="primary">
            Try the intake
          </ButtonLink>
          <ButtonLink href="/ops/board">See the case board</ButtonLink>
        </div>
      </main>
    </div>
  );
}

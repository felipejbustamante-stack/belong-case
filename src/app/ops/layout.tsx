import Link from "next/link";
import { OpsNav } from "@/components/OpsNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PresenterBar } from "@/components/PresenterBar";
import { BelongWordmark, SimulationBadge } from "@/components/ui";
import { listCases, getScenario, describeScenario } from "@/lib/store";
import { openCases, vendorsIn } from "@/lib/triage/conflicts";
import { TEST_INPUTS } from "@/lib/domain/testInputs";
import { COORDINATOR_CAPACITY } from "@/lib/domain/policy";
import { HOMES } from "@/lib/domain/homes";
import { ZONE } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const cases = listCases();
  const scenario = getScenario();

  // Only the vendors actually committed on the open board are offered as
  // scenario levers — those are the ones whose loss changes anything.
  const vendors = Array.from(
    new Map(
      openCases(cases)
        .flatMap((c) => vendorsIn(c.assignment))
        .map((v) => [v.name, { name: v.name, capacity: v.capacity }]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen">
      {/* Opaque rather than translucent: content scrolling under a blurred bar
          reads as a rendering fault on a projector. */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-shell flex-wrap items-center gap-x-5 gap-y-3 px-6 py-3">
          <Link href="/" className="flex items-baseline gap-2.5">
            <BelongWordmark className="text-[17px]" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink3">
              Field Operations
            </span>
          </Link>

          <OpsNav />

          <div className="ml-auto flex items-center gap-3">
            <SimulationBadge className="hidden lg:inline-flex" />
            <ThemeToggle />
            <Link
              href="/resident"
              className="rounded-full border border-line px-3.5 py-1.5 text-[12.5px] font-semibold text-ink2 transition hover:border-brand hover:text-brand"
            >
              Resident view
            </Link>
          </div>
        </div>
      </header>

      <PresenterBar
        inputs={TEST_INPUTS.map(({ id, relatedCase, channel, demonstrates }) => ({
          id,
          relatedCase,
          channel,
          demonstrates,
        }))}
        vendors={vendors}
        coordinators={Object.keys(COORDINATOR_CAPACITY)}
        homes={HOMES.map((h) => ({ id: h.id, label: `${h.id} · ${ZONE[h.zone]}` }))}
        scenario={scenario}
        activeDescription={describeScenario(scenario)}
      />

      <main className="mx-auto max-w-shell px-6 py-8">{children}</main>
    </div>
  );
}

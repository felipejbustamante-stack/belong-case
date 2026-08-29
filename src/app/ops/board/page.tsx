import { listCases, getScenario, describeScenario, scenarioIsActive } from "@/lib/store";
import { standingConflicts } from "@/lib/triage/conflicts";
import { toView } from "@/lib/ops/board";
import { OWNERS } from "@/lib/domain/policy";
import { BoardClient } from "./BoardClient";
import type { Conflict } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

const key = (c: Conflict) => `${c.kind}|${c.text}`;

/**
 * Conflicts are computed on the server, from the same engine the inbox uses,
 * so the board and the intake can never disagree about what is breaking.
 *
 * When a scenario is applied, the board is computed twice — once against the
 * real world and once under the what-if — and the difference is marked. The
 * question in a live discussion is never "what does the board look like now";
 * it is "what does this change break that was not already broken".
 *
 * `?q=` seeds the search box, so a case committed from the inbox can be linked
 * to directly.
 */
export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const cases = listCases();
  const scenario = getScenario();
  const active = scenarioIsActive(scenario);

  const conflicts = standingConflicts(cases, scenario);
  const baseline = active ? standingConflicts(cases) : conflicts;
  const before = new Set(baseline.map(key));
  const newKeys = active ? conflicts.filter((c) => !before.has(key(c))).map(key) : [];

  return (
    <BoardClient
      cases={cases.map(toView)}
      conflicts={conflicts}
      owners={OWNERS}
      initialQuery={q ?? ""}
      newKeys={newKeys}
      scenarioDescription={active ? describeScenario(scenario) : []}
    />
  );
}

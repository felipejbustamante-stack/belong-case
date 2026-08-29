import { listCases } from "@/lib/store";
import { standingConflicts } from "@/lib/triage/conflicts";
import { toView } from "@/lib/ops/board";
import { OWNERS } from "@/lib/domain/policy";
import { BoardClient } from "./BoardClient";

export const dynamic = "force-dynamic";

/**
 * The conflicts are computed on the server, from the same engine the inbox
 * uses, so the board and the intake can never disagree about what is breaking.
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
  return (
    <BoardClient
      cases={cases.map(toView)}
      conflicts={standingConflicts(cases)}
      owners={OWNERS}
      initialQuery={q ?? ""}
    />
  );
}

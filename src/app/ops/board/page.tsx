import { listCases } from "@/lib/store";
import { standingConflicts } from "@/lib/triage/conflicts";
import { toView } from "@/lib/ops/board";
import { OWNERS } from "@/lib/domain/policy";
import { BoardClient } from "./BoardClient";

export const dynamic = "force-dynamic";

/**
 * The conflicts are computed on the server, from the same engine the inbox
 * uses, so the board and the intake can never disagree about what is breaking.
 */
export default function BoardPage() {
  const cases = listCases();
  return (
    <BoardClient
      cases={cases.map(toView)}
      conflicts={standingConflicts(cases)}
      owners={OWNERS}
    />
  );
}

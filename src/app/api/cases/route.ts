import { NextResponse } from "next/server";
import { listCases, updateCase, listLog } from "@/lib/store";
import { standingConflicts } from "@/lib/triage/conflicts";
import { OWNERS } from "@/lib/domain/policy";
import type { CaseStatus, OpsCase } from "@/lib/domain/types";

const STATUSES: CaseStatus[] = [
  "New",
  "Dispatched",
  "In progress",
  "Blocked",
  "Verified",
  "Closed",
];

export async function GET() {
  const cases = listCases();
  return NextResponse.json({
    cases,
    conflicts: standingConflicts(cases),
    log: listLog(),
  });
}

/**
 * Status, owner and priority changes.
 *
 * A priority override must carry a reason. The engine's grade is preserved on
 * the case and both values go to the decision log: an operator may disagree
 * with the engine, but not silently, and the disagreements are what the rules
 * are tuned against later.
 *
 * There is deliberately no route here for a licensed-trade, spend-authority or
 * access-gate override. Those are policy, and policy has no bypass.
 */
export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    owner?: string;
    priority?: string;
    reason?: string;
  };

  const { id, status, owner, priority, reason } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const patch: Partial<OpsCase> = {};

  if (status !== undefined) {
    if (!STATUSES.includes(status as CaseStatus)) {
      return NextResponse.json({ error: `Unknown status: ${status}` }, { status: 400 });
    }
    patch.status = status as CaseStatus;
  }

  if (owner !== undefined) {
    if (!OWNERS.includes(owner)) {
      return NextResponse.json({ error: `Unknown owner: ${owner}` }, { status: 400 });
    }
    patch.owner = owner;
  }

  if (priority !== undefined) {
    const trimmed = priority.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "A priority is required." }, { status: 400 });
    }
    if (!reason || reason.trim().length < 4) {
      return NextResponse.json(
        {
          error:
            "A priority override must state a reason. Both the engine's grade and yours are recorded.",
        },
        { status: 400 },
      );
    }
    patch.priority = trimmed;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const note =
    priority !== undefined && reason
      ? `Priority overridden to "${priority.trim()}" — ${reason.trim()}`
      : undefined;

  const updated = updateCase(id, patch, note);
  if (!updated) return NextResponse.json({ error: "case not found" }, { status: 404 });
  return NextResponse.json({ ok: true, case: updated });
}

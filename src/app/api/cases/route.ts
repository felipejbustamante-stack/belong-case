import { NextResponse } from "next/server";
import {
  listCases,
  updateCase,
  listLog,
  addCase,
  nextCaseId,
  getIntake,
  commitIntake,
} from "@/lib/store";
import { standingConflicts } from "@/lib/triage/conflicts";
import { triage } from "@/lib/triage/engine";
import { caseFromTriage } from "@/lib/ops/commit";
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
 * Committing an intake message to the board — the de-duplication the inherited
 * queue never had. Two outcomes, both chosen by a person:
 *
 *   attach — this is the same issue as an open case, so it becomes an update on
 *            that case. One case, not two.
 *   open   — this is genuinely new, so it opens a case seeded from the triage.
 *
 * The message is re-triaged here from the stored body. The client's rendering
 * of a work order is never trusted as input: everything third-party is
 * untrusted by default, and that includes what a browser posts back.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    intakeId?: string;
    action?: "attach" | "open";
    caseId?: string;
  };

  const { intakeId, action, caseId } = body;
  if (!intakeId) {
    return NextResponse.json({ error: "intakeId is required" }, { status: 400 });
  }

  const entry = getIntake(intakeId);
  if (!entry) {
    return NextResponse.json({ error: "intake message not found" }, { status: 404 });
  }
  if (entry.committedTo) {
    return NextResponse.json(
      { error: `Already committed to ${entry.committedTo}.` },
      { status: 409 },
    );
  }

  if (action === "attach") {
    if (!caseId) {
      return NextResponse.json(
        { error: "caseId is required to log this as an update." },
        { status: 400 },
      );
    }
    const updated = updateCase(
      caseId,
      {},
      `Update received via ${entry.channel}: ${entry.body}`,
    );
    if (!updated) {
      return NextResponse.json({ error: "case not found" }, { status: 404 });
    }
    commitIntake(intakeId, caseId);
    return NextResponse.json({ ok: true, mode: "attached", caseId });
  }

  if (action === "open") {
    const r = triage(entry.body, entry.homeId ?? null);
    const id = nextCaseId();
    const opened = addCase(caseFromTriage(r, id, entry.body, entry.channel));
    commitIntake(intakeId, id);
    return NextResponse.json({ ok: true, mode: "opened", caseId: opened.id });
  }

  return NextResponse.json(
    { error: 'action must be "attach" or "open"' },
    { status: 400 },
  );
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

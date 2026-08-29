import { NextResponse } from "next/server";
import {
  listCases,
  updateCase,
  listLog,
  addCase,
  nextCaseId,
  getIntake,
  commitIntake,
  getScenario,
} from "@/lib/store";
import { standingConflicts } from "@/lib/triage/conflicts";
import { triage } from "@/lib/triage/engine";
import { caseFromTriage } from "@/lib/ops/commit";
import { blockedReason } from "@/lib/ops/gates";
import { OWNERS } from "@/lib/domain/policy";
import type { CaseStatus, GateKey, OpsCase } from "@/lib/domain/types";

const STATUSES: CaseStatus[] = [
  "New",
  "Dispatched",
  "In progress",
  "Blocked",
  "Verified",
  "Closed",
];

const GATE_KEYS: GateKey[] = [
  "accessConfirmed",
  "coiReceipted",
  "buildingRuleMet",
  "licenceVerified",
  "partsOnHand",
];

export async function GET() {
  const cases = listCases();
  const scenario = getScenario();
  return NextResponse.json({
    cases,
    // Under the same what-if the board is showing, so the API and the screen
    // never describe two different worlds.
    conflicts: standingConflicts(cases, scenario),
    scenario,
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
    gate?: { key?: string; note?: string };
    verification?: { owner?: string; check?: string };
  };

  const { id, status, owner, priority, reason, gate, verification } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const current = listCases().find((c) => c.id === id);
  if (!current) return NextResponse.json({ error: "case not found" }, { status: 404 });

  const patch: Partial<OpsCase> = {};
  const notes: string[] = [];

  // Satisfying a dispatch condition: a person records what they checked.
  if (gate) {
    if (!gate.key || !GATE_KEYS.includes(gate.key as GateKey)) {
      return NextResponse.json({ error: `Unknown condition: ${gate.key}` }, { status: 400 });
    }
    if (!gate.note || gate.note.trim().length < 3) {
      return NextResponse.json(
        { error: "Say what was checked. A tick with nothing behind it is what the gate exists to prevent." },
        { status: 400 },
      );
    }
    patch.gate = {
      ...(current.gate ?? {}),
      [gate.key as GateKey]: { at: new Date().toISOString(), note: gate.note.trim() },
    };
    notes.push(`Dispatch condition satisfied — ${gate.key}: ${gate.note.trim()}`);
  }

  // Naming the verification owner and what they functionally checked.
  if (verification) {
    const vOwner = verification.owner?.trim();
    const check = verification.check?.trim();
    if (!vOwner || !OWNERS.includes(vOwner)) {
      return NextResponse.json(
        { error: "Verification requires a named Belong person." },
        { status: 400 },
      );
    }
    if (!check) {
      return NextResponse.json(
        { error: "Record the functional check — what was tested, not that the vendor finished." },
        { status: 400 },
      );
    }
    patch.verification = { owner: vOwner, at: new Date().toISOString(), check };
    notes.push(`Verified by ${vOwner}: ${check}`);
  }

  if (status !== undefined) {
    if (!STATUSES.includes(status as CaseStatus)) {
      return NextResponse.json({ error: `Unknown status: ${status}` }, { status: 400 });
    }
    // The gate is enforced here, not only drawn in the interface. Disabling a
    // menu option is a courtesy; refusing the transition is the control.
    const blocked = blockedReason(
      { ...current, ...patch },
      status as CaseStatus,
    );
    if (blocked) {
      return NextResponse.json({ error: blocked, blocked: true }, { status: 409 });
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

  if (priority !== undefined && reason) {
    notes.push(`Priority overridden to "${priority.trim()}" — ${reason.trim()}`);
  }
  const note = notes.length ? notes.join(" ") : undefined;

  const updated = updateCase(id, patch, note);
  if (!updated) return NextResponse.json({ error: "case not found" }, { status: 404 });
  return NextResponse.json({ ok: true, case: updated });
}

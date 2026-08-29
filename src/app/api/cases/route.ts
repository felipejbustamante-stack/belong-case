import { NextResponse } from "next/server";
import { listCases, updateCase, addCase, nextCaseId, listLog } from "@/lib/store";
import { standingConflicts } from "@/lib/triage/conflicts";

export async function GET() {
  const cases = listCases();
  return NextResponse.json({
    cases,
    conflicts: standingConflicts(cases),
    log: listLog(),
  });
}

/** Status and owner changes. Every change is written to the decision log. */
export async function PATCH(req: Request) {
  const { id, ...patch } = (await req.json()) as { id: string; status?: string; owner?: string };
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updated = updateCase(id, patch as never);
  if (!updated) return NextResponse.json({ error: "case not found" }, { status: 404 });
  return NextResponse.json({ ok: true, case: updated });
}

export { addCase, nextCaseId };

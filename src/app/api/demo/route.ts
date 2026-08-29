import { NextResponse } from "next/server";
import {
  addIntake,
  reset,
  getScenario,
  setScenario,
  EMPTY_SCENARIO,
} from "@/lib/store";
import { testInputById, TEST_INPUTS } from "@/lib/domain/testInputs";
import type { Scenario } from "@/lib/domain/types";

/**
 * Presenter controls. Everything here is demonstration plumbing — replaying the
 * supplied inputs, laying a what-if over the board, and putting the world back
 * to Monday 08:00 between rehearsals.
 *
 * None of it can change a decision. A scenario alters vendor and team
 * availability, which is what the interview changes in real time; it cannot
 * touch a priority, a licence rule or a spend authority, and there is no route
 * here that could.
 */
export async function GET() {
  return NextResponse.json({
    inputs: TEST_INPUTS.map(({ id, relatedCase, channel, demonstrates }) => ({
      id,
      relatedCase,
      channel,
      demonstrates,
    })),
    scenario: getScenario(),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    inputId?: string;
    scenario?: Partial<Scenario>;
  };

  switch (body.action) {
    case "replay": {
      const input = testInputById(body.inputId ?? "");
      if (!input) {
        return NextResponse.json(
          { error: `Unknown test input: ${body.inputId}` },
          { status: 400 },
        );
      }
      const entry = addIntake({ body: input.body, channel: input.channel });
      return NextResponse.json({ ok: true, intake: entry });
    }

    case "scenario": {
      const s: Scenario = {
        vendorsDown: body.scenario?.vendorsDown ?? [],
        vendorCapacity: body.scenario?.vendorCapacity ?? {},
        coordinatorsOut: body.scenario?.coordinatorsOut ?? [],
      };
      return NextResponse.json({ ok: true, scenario: setScenario(s) });
    }

    case "clear-scenario":
      return NextResponse.json({
        ok: true,
        scenario: setScenario(structuredClone(EMPTY_SCENARIO)),
      });

    case "reset":
      reset();
      return NextResponse.json({ ok: true, reset: true });

    default:
      return NextResponse.json(
        { error: 'action must be "replay", "scenario", "clear-scenario" or "reset"' },
        { status: 400 },
      );
  }
}

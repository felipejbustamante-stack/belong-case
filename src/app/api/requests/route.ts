import { NextResponse } from "next/server";
import { addIntake, listIntake } from "@/lib/store";
import type { Channel } from "@/lib/domain/types";

const CHANNELS: Channel[] = ["App", "SMS", "Email", "Phone", "Live chat", "Vendor portal"];

export async function GET() {
  return NextResponse.json({ intake: listIntake() });
}

/**
 * Accepts a report exactly as written. The text is never normalised or cleaned
 * before triage — the engine needs the original, including anything pasted into
 * it, so that embedded instructions can be detected and quarantined.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    body?: string; channel?: string; reporter?: string; homeId?: string;
  };

  const text = (body.body ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "A message body is required." }, { status: 400 });
  }
  const channel = CHANNELS.includes(body.channel as Channel)
    ? (body.channel as Channel)
    : "App";

  const entry = addIntake({
    body: text,
    channel,
    reporter: body.reporter?.trim() || undefined,
    homeId: body.homeId?.trim() || undefined,
  });

  return NextResponse.json({ ok: true, intake: entry }, { status: 201 });
}

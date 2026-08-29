"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Channel, Scenario } from "@/lib/domain/types";
import { Button, Label, Pill } from "@/components/ui";

/**
 * Presenter controls, in one place the demonstrator can always reach.
 *
 * Three things happen in a live discussion: the supplied inputs are replayed,
 * an unseen message arrives and has to be triaged on the spot, and someone
 * changes vendor or team availability to see whether the plan survives it.
 * Hunting for three different screens while an interview panel watches is how
 * a good artifact demonstrates badly.
 *
 * A scenario can only change availability. It cannot reach a priority, a
 * licence rule or a spend authority — those have no override anywhere in this
 * product, including here.
 */

const CHANNELS: Channel[] = ["App", "SMS", "Email", "Phone", "Vendor portal"];

type Tab = "message" | "replay" | "scenario";

export interface PresenterInput {
  id: string;
  relatedCase: string;
  channel: Channel;
  demonstrates: string;
}

export function PresenterBar({
  inputs,
  vendors,
  coordinators,
  homes,
  scenario,
  activeDescription,
}: {
  inputs: PresenterInput[];
  vendors: { name: string; capacity: string }[];
  coordinators: string[];
  homes: { id: string; label: string }[];
  scenario: Scenario;
  activeDescription: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("message");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  // new message
  const [channel, setChannel] = useState<Channel>("Phone");
  const [homeId, setHomeId] = useState("");
  const [text, setText] = useState("");

  // scenario draft
  const [down, setDown] = useState<string[]>(scenario.vendorsDown);
  const [out, setOut] = useState<string[]>(scenario.coordinatorsOut);
  const [caps, setCaps] = useState<Record<string, number>>(scenario.vendorCapacity);

  const active = activeDescription.length > 0;

  async function post(url: string, payload: unknown, say: string) {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not work.");
      setNote(say);
      router.refresh();
      return true;
    } catch (err) {
      setNote(err instanceof Error ? err.message : "That did not work.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const tabClass = (t: Tab) =>
    `rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${
      tab === t ? "bg-brand text-brandInk" : "text-ink3 hover:bg-surface2 hover:text-ink"
    }`;

  return (
    <div className="border-b border-line bg-surface2">
      <div className="mx-auto flex max-w-shell flex-wrap items-center gap-3 px-6 py-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Hide presenter controls" : "Presenter controls"}
        </Button>

        {active && (
          <>
            <Pill tone="warn">Scenario active</Pill>
            <span className="text-[12.5px] text-ink2">{activeDescription.join(" · ")}</span>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                await post("/api/demo", { action: "clear-scenario" }, "Scenario cleared.");
                setDown([]);
                setOut([]);
                setCaps({});
              }}
            >
              Clear
            </Button>
          </>
        )}

        {note && <span className="ml-auto text-[12.5px] text-ink3">{note}</span>}
      </div>

      {open && (
        <div className="mx-auto max-w-shell px-6 pb-4">
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={tabClass("message")} onClick={() => setTab("message")}>
                New message
              </button>
              <button type="button" className={tabClass("replay")} onClick={() => setTab("replay")}>
                Replay supplied inputs
              </button>
              <button type="button" className={tabClass("scenario")} onClick={() => setTab("scenario")}>
                Change availability
              </button>

              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                disabled={busy}
                onClick={async () => {
                  if (!confirm("Reset to the seeded Monday 08:00 board? Everything committed in this session is discarded.")) return;
                  await post("/api/demo", { action: "reset" }, "Back to Monday 08:00.");
                  setDown([]);
                  setOut([]);
                  setCaps({});
                }}
              >
                Reset to Monday 08:00
              </Button>
            </div>

            {tab === "message" && (
              <div className="mt-4">
                <Label>Paste a message and triage it now</Label>
                <p className="mt-1 text-[12.5px] text-ink2">
                  It arrives in the inbox exactly as written, is triaged on read,
                  and commits to nothing until a person says so.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {CHANNELS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setChannel(c)}
                      aria-pressed={channel === c}
                      className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold transition ${
                        channel === c
                          ? "border-brand bg-brand text-brandInk"
                          : "border-line bg-surface text-ink2 hover:border-brand hover:text-brand"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  placeholder="Paste the message here, exactly as it arrived."
                  className="mt-2.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] leading-relaxed outline-none placeholder:text-ink3 focus:border-brand"
                />
                <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                  <select
                    value={homeId}
                    onChange={(e) => setHomeId(e.target.value)}
                    aria-label="Home"
                    className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-brand"
                  >
                    <option value="">Let the engine identify the Home</option>
                    {homes.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={busy || !text.trim()}
                    onClick={async () => {
                      const ok = await post(
                        "/api/requests",
                        { body: text, channel, homeId: homeId || undefined },
                        "Triaged — it is at the top of the inbox.",
                      );
                      if (ok) setText("");
                    }}
                  >
                    Triage it
                  </Button>
                </div>
              </div>
            )}

            {tab === "replay" && (
              <div className="mt-4">
                <Label>The supplied AI test inputs</Label>
                <p className="mt-1 text-[12.5px] text-ink2">
                  Each arrives through the channel it came from. Send them one at
                  a time and watch the inbox fill.
                </p>
                <ul className="mt-2.5 grid gap-2 lg:grid-cols-2">
                  {inputs.map((i) => (
                    <li
                      key={i.id}
                      className="flex flex-wrap items-start gap-2.5 rounded-lg border border-line bg-surface2 p-3"
                    >
                      <div className="min-w-[14rem] flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <code className="font-mono text-[12.5px] font-semibold">{i.id}</code>
                          <span className="text-[12px] text-ink3">
                            {i.channel} · relates to {i.relatedCase}
                          </span>
                        </p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-ink2">
                          {i.demonstrates}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          post(
                            "/api/demo",
                            { action: "replay", inputId: i.id },
                            `${i.id} is in the inbox.`,
                          )
                        }
                      >
                        Send
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === "scenario" && (
              <div className="mt-4">
                <Label>Change what is available, then look at the board</Label>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink2">
                  This changes availability only. It cannot alter a priority, a
                  licence requirement or a spend authority — nothing in this
                  product can. Nothing is written to the vendor or team data, so
                  clearing it restores the real board exactly.
                </p>

                <div className="mt-3 grid gap-4 lg:grid-cols-3">
                  <div>
                    <Label>Vendor unavailable</Label>
                    <ul className="mt-2 space-y-1.5">
                      {vendors.map((v) => (
                        <li key={v.name}>
                          <label className="flex items-start gap-2 text-[12.5px] text-ink2">
                            <input
                              type="checkbox"
                              checked={down.includes(v.name)}
                              onChange={() => setDown(toggle(down, v.name))}
                              className="mt-0.5"
                            />
                            <span>
                              {v.name}{" "}
                              <span className="text-ink3">({v.capacity})</span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <Label>Capacity cut</Label>
                    <ul className="mt-2 space-y-1.5">
                      {vendors.map((v) => (
                        <li key={v.name} className="flex items-center gap-2">
                          <span className="flex-1 text-[12.5px] text-ink2">{v.name}</span>
                          <select
                            aria-label={`${v.name} capacity`}
                            value={caps[v.name] ?? ""}
                            onChange={(e) => {
                              const next = { ...caps };
                              if (e.target.value === "") delete next[v.name];
                              else next[v.name] = Number(e.target.value);
                              setCaps(next);
                            }}
                            className="rounded-lg border border-line bg-surface px-2 py-1 text-[12.5px] outline-none focus:border-brand"
                          >
                            <option value="">as stated</option>
                            {[0, 1, 2, 3].map((n) => (
                              <option key={n} value={n}>
                                {n}/day
                              </option>
                            ))}
                          </select>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <Label>Coordinator out</Label>
                    <ul className="mt-2 space-y-1.5">
                      {coordinators.map((c) => (
                        <li key={c}>
                          <label className="flex items-center gap-2 text-[12.5px] text-ink2">
                            <input
                              type="checkbox"
                              checked={out.includes(c)}
                              onChange={() => setOut(toggle(out, c))}
                            />
                            {c}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      post(
                        "/api/demo",
                        {
                          action: "scenario",
                          scenario: { vendorsDown: down, coordinatorsOut: out, vendorCapacity: caps },
                        },
                        "Applied. The board shows what it newly breaks.",
                      )
                    }
                  >
                    Apply to the board
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={async () => {
                      await post("/api/demo", { action: "clear-scenario" }, "Scenario cleared.");
                      setDown([]);
                      setOut([]);
                      setCaps({});
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

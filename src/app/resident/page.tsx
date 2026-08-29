"use client";

import { useState } from "react";
import Link from "next/link";
import { HOMES } from "@/lib/domain/homes";
import { ZONE, type Channel } from "@/lib/domain/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  BelongWordmark,
  Button,
  ButtonLink,
  Card,
  Label,
  SimulationBadge,
} from "@/components/ui";

const CHANNELS: { key: Channel; label: string; hint: string }[] = [
  { key: "App", label: "In-app", hint: "Typed into the Resident app" },
  { key: "SMS", label: "Text", hint: "Sent as a text message" },
  { key: "Email", label: "Email", hint: "Written as an email" },
  { key: "Phone", label: "Phone note", hint: "Transcribed from a call" },
];

/**
 * The Resident-facing surface. Deliberately plain: a person reporting a problem
 * should not have to categorise it, pick a priority, or know which trade is
 * involved. Everything the operations team needs is derived from what they
 * write.
 *
 * The channel selector is not decoration — the same issue arriving twice
 * through two channels is exactly how the inherited queue ended up carrying the
 * same ceiling stain as two separate cases.
 */
export default function ResidentPage() {
  const [channel, setChannel] = useState<Channel>("App");
  const [homeId, setHomeId] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, channel, homeId: homeId || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Could not send the report.");
      }
      setState("sent");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the report.");
      setState("error");
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-shell flex-wrap items-center gap-4 px-6 py-3">
          <Link href="/" className="flex items-baseline gap-2.5">
            <BelongWordmark className="text-[17px]" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink3">
              Resident
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <SimulationBadge className="hidden sm:inline-flex" />
            <ThemeToggle />
            <Link
              href="/ops"
              className="rounded-full border border-line px-3.5 py-1.5 text-[12.5px] font-semibold text-ink2 transition hover:border-brand hover:text-brand"
            >
              Operations view
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-24 pt-14">
        {state === "sent" ? (
          <div className="animate-rise">
            <Card className="overflow-hidden">
              <div className="border-l-4 border-brand p-8">
                <Label>Received</Label>
                <h1 className="mt-2 font-display text-3xl font-semibold leading-tight">
                  Thank you — we have it.
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-ink2">
                  Someone on the team is reading this now. You will hear back from
                  a named person with a time — not an automated acknowledgement,
                  and not a promise nobody can stand behind.
                </p>
              </div>
            </Card>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => setState("idle")}>
                Report something else
              </Button>
              <ButtonLink href="/ops">See how operations received it</ButtonLink>
            </div>
          </div>
        ) : (
          <>
            <Label>Belong · Resident</Label>
            <h1 className="mt-3 font-display text-[38px] font-semibold leading-[1.12] tracking-tight">
              Tell us what is wrong
            </h1>
            <p className="mt-4 text-[15.5px] leading-relaxed text-ink2">
              Write it however you would say it. You do not need to choose a
              category, name a trade, or decide how urgent it is — that is our
              job, and we will show you what we decided.
            </p>

            <form onSubmit={submit} className="mt-9 space-y-7">
              <fieldset>
                <legend className="label">How is this arriving</legend>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {CHANNELS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setChannel(c.key)}
                      aria-pressed={channel === c.key}
                      title={c.hint}
                      className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
                        channel === c.key
                          ? "border-brand bg-brand text-brandInk"
                          : "border-line bg-surface text-ink2 hover:border-brand hover:text-brand"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="body" className="label">
                  What is happening
                </label>
                <textarea
                  id="body"
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder="For example: the cabinet under the kitchen sink is leaking again. I turned the little valve and it seems stopped, but the bottom is soaked. I can stay until 11:30."
                  className="mt-2 w-full rounded-xl border border-line bg-surface p-4 text-[15px] leading-relaxed text-ink outline-none transition placeholder:text-ink3 focus:border-brand"
                />
              </div>

              <div>
                <label htmlFor="home" className="label">
                  Your Home (optional)
                </label>
                <select
                  id="home"
                  value={homeId}
                  onChange={(e) => setHomeId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-line bg-surface p-3.5 text-[14px] text-ink outline-none transition focus:border-brand"
                >
                  <option value="">We will work it out from what you wrote</option>
                  {HOMES.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.id} · {ZONE[h.zone]}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-dangerLine bg-dangerBg p-3.5 text-[14px] text-ink2"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={state === "sending" || !body.trim()}
                className="w-full"
              >
                {state === "sending" ? "Sending…" : "Send this to Belong"}
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

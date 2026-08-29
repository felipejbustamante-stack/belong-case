"use client";

import { useState } from "react";
import Link from "next/link";
import { HOMES } from "@/lib/domain/homes";
import { ZONE, type Channel } from "@/lib/domain/types";

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
 * write. The channel selector exists because the same issue arriving twice
 * through two channels is exactly how the queue ended up with duplicates.
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

  if (state === "sent") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20">
        <div className="border-l-4 border-accent bg-accentWash p-6">
          <h1 className="font-cond text-2xl font-bold">Thank you — we have it.</h1>
          <p className="mt-3 text-[15px] text-ink2">
            Someone on the team is reading this now. You will hear from us with a
            named person and a time, not an automated acknowledgement.
          </p>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setState("idle")} className="border border-ink bg-ink px-5 py-3 font-cond text-[13px] font-bold uppercase tracking-wider text-ground">
            Report something else
          </button>
          <Link href="/ops" className="border border-line px-5 py-3 font-cond text-[13px] font-bold uppercase tracking-wider text-ink2 hover:border-accent hover:text-accent">
            See how operations received it
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <p className="label">Belong · Resident</p>
      <h1 className="mt-3 font-cond text-3xl font-bold leading-tight">
        Tell us what is wrong
      </h1>
      <p className="mt-3 text-[15px] text-ink2">
        Write it however you would say it. You do not need to choose a category
        or decide how urgent it is — that is our job.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <div>
          <span className="label">How is this arriving</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setChannel(c.key)}
                aria-pressed={channel === c.key}
                title={c.hint}
                className={`border px-4 py-2 font-cond text-[12px] font-semibold uppercase tracking-wider transition ${
                  channel === c.key
                    ? "border-ink bg-ink text-ground"
                    : "border-line bg-surface text-ink2 hover:border-accent hover:text-accent"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

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
            className="mt-2 w-full border border-line bg-surface2 p-3 text-[15px] leading-relaxed text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent"
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
            className="mt-2 w-full border border-line bg-surface2 p-3 text-[14px] text-ink outline-none focus:border-accent"
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
          <p className="border-l-4 border-danger bg-dangerBg p-3 text-[14px] text-ink2">{error}</p>
        )}

        <button
          type="submit"
          disabled={state === "sending" || !body.trim()}
          className="w-full border border-ink bg-ink px-6 py-4 font-cond text-[14px] font-bold uppercase tracking-wider text-ground transition hover:border-accent hover:bg-accent hover:text-white disabled:opacity-50"
        >
          {state === "sending" ? "Sending" : "Send this to Belong"}
        </button>
      </form>
    </main>
  );
}

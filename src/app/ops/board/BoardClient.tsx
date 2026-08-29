"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CaseView } from "@/lib/ops/board";
import { isOpen } from "@/lib/ops/board";
import type { CaseStatus, Conflict } from "@/lib/domain/types";
import {
  Button,
  Card,
  Label,
  Pill,
  RagDot,
  priorityTone,
  severityTone,
} from "@/components/ui";

const STATUSES: CaseStatus[] = [
  "New",
  "Dispatched",
  "In progress",
  "Blocked",
  "Verified",
  "Closed",
];

const WORKSTREAMS = ["In-Home Services", "Turnover / Home Readiness", "Onboarding"];

/* ----------------------------------------------------------- risk to plan */

function RiskPanel({
  conflicts,
  newKeys,
  scenarioDescription,
  onPickCase,
}: {
  conflicts: Conflict[];
  newKeys: string[];
  scenarioDescription: string[];
  onPickCase: (id: string) => void;
}) {
  const blocking = conflicts.filter((c) => c.severity === "high");
  const isNew = (c: Conflict) => newKeys.includes(`${c.kind}|${c.text}`);
  const newly = conflicts.filter(isNew);

  if (!conflicts.length) {
    return (
      <Card className="p-5">
        <Label>Risk to the plan</Label>
        <p className="mt-1.5 text-[14px] text-ink2">
          Nothing on the board is currently blocking. Owners, vendor day
          capacity, single-instance field inventory, committed move-ins and zone
          coverage all check out.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <details open={blocking.length > 0}>
        <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-4 hover:bg-surface2">
          <Label>Risk to the plan</Label>
          {blocking.length > 0 ? (
            <Pill tone="danger">{blocking.length} blocking</Pill>
          ) : (
            <Pill tone="warn">{conflicts.length} to watch</Pill>
          )}
          <span className="text-[13px] text-ink3">
            {conflicts.length} finding{conflicts.length === 1 ? "" : "s"} across the
            whole board
          </span>
          <span className="ml-auto text-[12.5px] text-ink3">
            Reported, not re-planned
          </span>
        </summary>

        <div className="border-t border-line">
          {scenarioDescription.length > 0 && (
            <div className="border-b border-warnLine bg-warnBg px-5 py-3">
              <p className="text-[13px] font-semibold text-warn">
                What-if applied: {scenarioDescription.join(" · ")}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink2">
                {newly.length === 0
                  ? "This change breaks nothing that was not already broken. The plan absorbs it."
                  : `It newly breaks ${newly.length} thing${newly.length > 1 ? "s" : ""}, marked below. Everything else was already true.`}
              </p>
            </div>
          )}
          <p className="border-b border-line2 bg-surface2 px-5 py-2.5 text-[12.5px] leading-relaxed text-ink3">
            The board reports what a change breaks and stops there. Re-planning
            the 72 hours is the manager&rsquo;s job; not being surprised is the
            tool&rsquo;s.
          </p>
          {/* Capped so a long findings list cannot push the board itself off-screen. */}
          <ul className="max-h-[21rem] divide-y divide-line2 overflow-y-auto">
            {[...conflicts].sort((a, b) => Number(isNew(b)) - Number(isNew(a))).map((c, i) => (
              <li
                key={i}
                className={`flex flex-wrap items-start gap-3 px-5 py-3.5 ${
                  isNew(c) ? "bg-warnBg/50" : ""
                }`}
              >
                {isNew(c) && <Pill tone="warn">New</Pill>}
                <Pill tone={severityTone(c.severity)}>{c.kind}</Pill>
                <span className="min-w-[18rem] flex-1 text-[13.5px] leading-relaxed text-ink2">
                  {c.text}
                </span>
                {c.caseIds.length > 0 && (
                  <span className="flex flex-wrap gap-1">
                    {c.caseIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onPickCase(id)}
                        className="rounded border border-line bg-surface2 px-1.5 py-0.5 font-mono text-[11.5px] text-ink2 transition hover:border-brand hover:text-brand"
                      >
                        {id}
                      </button>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </details>
    </Card>
  );
}

/* ------------------------------------------------------------- case card */

function Detail({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="label">{term}</dt>
      <dd className="mt-1 text-[13.5px] leading-relaxed text-ink2">{children}</dd>
    </div>
  );
}

/**
 * The gate that was missing. Each condition is satisfied by a person recording
 * what they checked — there is no tick-everything action and no bypass, because
 * a checklist that can be waved through is the state the operation was already
 * in when it booked a vendor against an empty Home.
 */
function GatePanel({
  c,
  owners,
  busy,
  patch,
}: {
  c: CaseView;
  owners: string[];
  busy: boolean;
  patch: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [vOwner, setVOwner] = useState(c.owner === "Unassigned" ? owners[0] : c.owner);
  const [check, setCheck] = useState("");

  const met = c.conditions.filter((x) => x.met).length;

  return (
    <div className="mt-4 rounded-xl border border-line bg-surface2 p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <Label>Dispatch readiness</Label>
        {c.conditions.length === 0 ? (
          <Pill tone="neutral">No conditions apply</Pill>
        ) : c.blockedDispatch ? (
          <Pill tone="danger">
            {met} of {c.conditions.length} met — dispatch refused
          </Pill>
        ) : (
          <Pill tone="good">All {c.conditions.length} met — may dispatch</Pill>
        )}
      </div>

      {c.conditions.length > 0 && (
        <ul className="mt-3 space-y-2.5">
          {c.conditions.map((cond) => (
            <li
              key={cond.key}
              className={`rounded-lg border p-3 ${
                cond.met ? "border-goodLine bg-goodBg" : "border-line bg-surface"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${cond.met ? "bg-good" : "bg-ink3"}`}
                  aria-hidden
                />
                <span className="text-[13px] font-semibold">{cond.label}</span>
                {cond.met ? (
                  <span className="text-[12px] text-ink3">
                    confirmed{cond.at ? ` ${new Date(cond.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    className="ml-auto"
                    onClick={() => {
                      setOpenKey(openKey === cond.key ? null : cond.key);
                      setNote("");
                    }}
                  >
                    Confirm
                  </Button>
                )}
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink2">{cond.why}</p>
              {cond.met && cond.note && (
                <p className="mt-1.5 border-l-2 border-goodLine pl-2.5 text-[12.5px] text-ink2">
                  {cond.note}
                </p>
              )}
              {openKey === cond.key && (
                <div className="mt-2.5 space-y-2">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="What did you check, and with whom?"
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none placeholder:text-ink3 focus:border-brand"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={busy || note.trim().length < 3}
                    onClick={async () => {
                      const ok = await patch({ gate: { key: cond.key, note } });
                      if (ok) setOpenKey(null);
                    }}
                  >
                    Record it
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-line pt-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Label>Verification owner</Label>
          {c.verification ? (
            <Pill tone="good">{c.verification.owner}</Pill>
          ) : (
            <Pill tone="warn">Nobody named</Pill>
          )}
          {!c.verification && (
            <Button size="sm" className="ml-auto" onClick={() => setVerifying((v) => !v)}>
              {verifying ? "Cancel" : "Name and verify"}
            </Button>
          )}
        </div>

        {c.verification ? (
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink2">
            {c.verification.check}
          </p>
        ) : (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink2">
            A vendor reporting completion is not verification. A named Belong
            person confirms the work functionally before this case can reach
            Verified.
          </p>
        )}

        {verifying && !c.verification && (
          <div className="mt-2.5 space-y-2">
            <label className="block">
              <span className="label">Who verified it</span>
              <select
                value={vOwner}
                onChange={(e) => setVOwner(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-brand"
              >
                {owners
                  .filter((o) => o !== "Unassigned")
                  .map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block">
              <span className="label">The functional check</span>
              <textarea
                value={check}
                onChange={(e) => setCheck(e.target.value)}
                rows={2}
                placeholder="What was tested, and what did it do? Not that the vendor finished."
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none placeholder:text-ink3 focus:border-brand"
              />
            </label>
            <Button
              variant="primary"
              size="sm"
              disabled={busy || !check.trim()}
              onClick={async () => {
                const ok = await patch({ verification: { owner: vOwner, check } });
                if (ok) setVerifying(false);
              }}
            >
              Record the verification
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CaseCard({
  c,
  owners,
  onChanged,
}: {
  c: CaseView;
  owners: string[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [overriding, setOverriding] = useState(false);
  const [nextPriority, setNextPriority] = useState(c.priority);
  const [reason, setReason] = useState("");

  async function patch(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, ...payload }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "The change could not be saved.");
      onChanged();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "The change could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="article" className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface2 px-5 py-3">
        <RagDot risk={c.risk} />
        <code className="font-mono text-[13px] font-semibold">{c.id}</code>
        <Pill tone={priorityTone(c.priority)}>{c.priority}</Pill>
        {c.enginePriority && (
          <Pill tone="neutral" title={`The engine graded this ${c.enginePriority}`}>
            overridden
          </Pill>
        )}
        <span className="text-[12.5px] text-ink3">{c.workstream}</span>
        {c.home?.moveIn && (
          <Pill tone="warn" title="Final QC must close at least 4 hours before handover">
            Move-in {c.home.moveIn}
          </Pill>
        )}
        <span className="ml-auto font-mono text-[12px] text-ink3">
          {c.homeId} · {c.zoneName}
        </span>
      </div>

      <div className="p-5">
        <h3 className="font-display text-[19px] font-semibold leading-snug">
          {c.title}
        </h3>

        <div className="mt-3 rounded-xl border border-brandLine bg-brandWash p-3.5">
          <Label>Next action</Label>
          <p className="mt-1 text-[13.5px] font-medium leading-relaxed text-ink">
            {c.action}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-2 text-[12.5px] text-ink3">
            Status
            <select
              value={c.status}
              disabled={busy}
              onChange={(e) => patch({ status: e.target.value })}
              className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none transition focus:border-brand disabled:opacity-50"
            >
              {STATUSES.map((s) => {
                // A gated transition is offered but refused, with the unmet
                // condition named. Hiding it would leave the operator guessing
                // why the case will not move.
                const blocked =
                  s === "Dispatched"
                    ? c.blockedDispatch
                    : s === "Verified"
                      ? c.blockedVerify
                      : null;
                return (
                  <option key={s} value={s} disabled={!!blocked} title={blocked ?? undefined}>
                    {s}
                    {blocked ? " — blocked" : ""}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="flex items-center gap-2 text-[12.5px] text-ink3">
            Owner
            <select
              value={c.owner}
              disabled={busy}
              onChange={(e) => patch({ owner: e.target.value })}
              className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none transition focus:border-brand disabled:opacity-50"
            >
              {owners.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          <Button
            size="sm"
            onClick={() => setOverriding((v) => !v)}
            aria-expanded={overriding}
          >
            {overriding ? "Cancel override" : "Override priority"}
          </Button>
        </div>

        {overriding && (
          <div className="mt-3 rounded-xl border border-warnLine bg-warnBg p-4">
            <p className="text-[13px] font-semibold text-warn">
              Disagreeing with the engine is allowed. Doing it silently is not.
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink2">
              Both grades are kept and written to the decision log
              {c.sla
                ? `. The engine graded this ${c.sla.level} under ${c.sla.level} policy.`
                : "."}
            </p>
            <div className="mt-3 space-y-2.5">
              <label className="block">
                <span className="label">New priority</span>
                <input
                  value={nextPriority}
                  onChange={(e) => setNextPriority(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] outline-none focus:border-brand"
                />
              </label>
              <label className="block">
                <span className="label">Reason (required)</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="What do you know that the rule does not?"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] outline-none placeholder:text-ink3 focus:border-brand"
                />
              </label>
              <Button
                variant="primary"
                size="sm"
                disabled={busy || !reason.trim() || !nextPriority.trim()}
                onClick={async () => {
                  const ok = await patch({ priority: nextPriority, reason });
                  if (ok) {
                    setOverriding(false);
                    setReason("");
                  }
                }}
              >
                Record the override
              </Button>
            </div>
          </div>
        )}

        {c.blockedDispatch && (
          <p className="mt-3 rounded-lg border border-warnLine bg-warnBg p-3 text-[12.5px] leading-relaxed text-ink2">
            <span className="font-semibold text-warn">Dispatch is blocked. </span>
            {c.blockedDispatch}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-dangerLine bg-dangerBg p-3 text-[13px] text-ink2">
            {error}
          </p>
        )}

        <GatePanel c={c} owners={owners} busy={busy} patch={patch} />

        <details className="mt-4">
          <summary className="cursor-pointer text-[13px] font-semibold text-brand hover:underline">
            Plan detail
          </summary>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="label">
                Why this priority
                {c.sla ? ` — ${c.sla.level} policy` : " — set by the 72-hour plan"}
              </dt>
              <dd className="mt-1 text-[13.5px] leading-relaxed text-ink2">
                {c.sla && (
                  <span className="mb-1.5 block border-l-2 border-brandLine pl-3 text-ink3">
                    {c.sla.clause}
                  </span>
                )}
                {c.rationale}
              </dd>
            </div>
            {c.enginePriority && (
              <div className="sm:col-span-2">
                <dt className="label">Engine grade before the override</dt>
                <dd className="mt-1 font-mono text-[13px] text-ink2">
                  {c.enginePriority}
                </dd>
              </div>
            )}
            <Detail term="Assignment">{c.assignment}</Detail>
            <Detail term="Access plan">{c.accessPlan}</Detail>
            <Detail term="Dependencies and approvals">{c.dependencies}</Detail>
            <Detail term="Cost">{c.cost}</Detail>
            <Detail term="Communication">{c.communication}</Detail>
            <Detail term="Fallback">{c.fallback}</Detail>
          </dl>

          {c.updates.length > 0 && (
            <div className="mt-4">
              <Label>Updates</Label>
              <ul className="mt-2 space-y-2">
                {c.updates.map((u, i) => (
                  <li key={i} className="rounded-lg border border-line bg-surface2 p-3">
                    <p className="font-mono text-[11.5px] text-ink3">
                      {new Date(u.at).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {u.channel ? ` · ${u.channel}` : ""}
                    </p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink2">
                      {u.text}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </details>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ board */

export function BoardClient({
  cases,
  conflicts,
  owners,
  initialQuery = "",
  newKeys = [],
  scenarioDescription = [],
}: {
  cases: CaseView[];
  conflicts: Conflict[];
  owners: string[];
  initialQuery?: string;
  newKeys?: string[];
  scenarioDescription?: string[];
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [workstream, setWorkstream] = useState("all");
  const [risk, setRisk] = useState("all");
  const [owner, setOwner] = useState("all");
  const [scope, setScope] = useState<"open" | "all">("open");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cases.filter((c) => {
      if (scope === "open" && !isOpen(c)) return false;
      if (workstream !== "all" && c.workstream !== workstream) return false;
      if (risk !== "all" && c.risk !== risk) return false;
      if (owner !== "all" && c.owner !== owner) return false;
      if (
        needle &&
        !`${c.id} ${c.title} ${c.homeId} ${c.zoneName} ${c.owner} ${c.priority} ${c.action}`
          .toLowerCase()
          .includes(needle)
      ) {
        return false;
      }
      return true;
    });
  }, [cases, q, workstream, risk, owner, scope]);

  const open = cases.filter(isOpen);
  const red = open.filter((c) => c.risk === "RED").length;
  const unassigned = open.filter((c) => c.owner === "Unassigned").length;

  const select =
    "rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none transition focus:border-brand";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Label>72-hour board</Label>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight">
            Case board
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink2">
            Every case with its reassessed priority, the reason behind it, an
            owner, a next action, an access plan and a fallback.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone="neutral">{open.length} open</Pill>
          <Pill tone={red ? "danger" : "good"}>{red} red</Pill>
          <Pill tone={unassigned ? "danger" : "good"}>{unassigned} unassigned</Pill>
        </div>
      </header>

      <RiskPanel
        conflicts={conflicts}
        newKeys={newKeys}
        scenarioDescription={scenarioDescription}
        onPickCase={(id) => setQ(id)}
      />

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search cases, Homes, owners…"
          aria-label="Search cases"
          className="min-w-[14rem] flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] outline-none placeholder:text-ink3 focus:border-brand"
        />
        <select
          aria-label="Workstream"
          value={workstream}
          onChange={(e) => setWorkstream(e.target.value)}
          className={select}
        >
          <option value="all">All workstreams</option>
          {WORKSTREAMS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <select
          aria-label="Risk"
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          className={select}
        >
          <option value="all">Red, amber and green</option>
          <option value="RED">Red only</option>
          <option value="AMBER">Amber only</option>
          <option value="GREEN">Green only</option>
        </select>
        <select
          aria-label="Owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className={select}
        >
          <option value="all">Any owner</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          aria-label="Scope"
          value={scope}
          onChange={(e) => setScope(e.target.value as "open" | "all")}
          className={select}
        >
          <option value="open">Open only</option>
          <option value="all">Including closed</option>
        </select>
        {(q || workstream !== "all" || risk !== "all" || owner !== "all") && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setQ("");
              setWorkstream("all");
              setRisk("all");
              setOwner("all");
            }}
          >
            Clear
          </Button>
        )}
        <span className="text-[12.5px] text-ink3">
          {shown.length} of {cases.length}
        </span>
      </Card>

      {shown.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-[14px] text-ink2">
            No case matches these filters.
          </p>
        </Card>
      ) : (
        <div
          className={`grid gap-4 ${shown.length > 1 ? "xl:grid-cols-2" : "max-w-3xl"}`}
        >
          {shown.map((c) => (
            <CaseCard
              key={c.id}
              c={c}
              owners={owners}
              onChanged={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

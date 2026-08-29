# Belong Field Operations — product context

This repo turns a field-operations case study into a working product: a Resident
intake surface and an operations back office. The domain logic in `src/lib` is
**already built and tested** — it is the most valuable thing here and it should
be extended, not rewritten.

Read this file before changing anything under `src/lib`.

---

## What this is

A synthetic South Florida market managing occupied-Home maintenance, turnovers
and onboarding. Nineteen cases are open at Monday 08:00 with a 72-hour planning
window. The product has two halves:

- **`/resident`** — where a Resident reports a problem. Simulates the real
  channels: app, SMS, email, phone note, vendor portal.
- **`/ops`** — the back office: inbox, triage, case board, conflict detection,
  per-coordinator view, metrics.

Everything a Resident submits flows through the same triage engine the ops team
sees. There is no separate path.

## The three failures this product exists to prevent

The inherited queue did not fail nineteen times. It failed three structural ways,
and every feature should trace back to closing one of them:

1. **Nothing checked whether a visit was executable before it was booked.** A
   vendor window was booked against a Resident who was not home. A visit was
   scheduled to a building that had already refused entry. → the **access gate**.
2. **Nothing de-duplicated at intake.** The same ceiling stain arrived through
   the app and by phone and became two cases. → **case matching at intake**.
3. **No one owned final verification.** Three committed move-ins had no named
   person to confirm the work was actually done. → **a verification owner**.

---

## Rules that are not negotiable

These are policy, not preference. Do not add an override, a "force" flag, or an
admin bypass for any of them.

- **Licensed trades.** Electrical, HVAC, plumbing, roofing, pool barrier and
  water mitigation require a licensed and insured vendor. A Field Specialist or
  a generalist may never be assigned to one. `LICENSED_TRADES` in
  `src/lib/domain/types.ts` is the source of truth. There is deliberately no UI
  path to violate this.
- **Containment is never resolution.** Stopping the harm and fixing the fault
  are separate states. A case is not resolved because a portable AC arrived.
- **Vendor completion is never verification.** A named Belong person confirms
  the work functionally. "The vendor said it's done" does not close a case.
- **Spend authority.** Within the Home limit: coordinator. Emergency containment
  to $1,500: lead. Signed-move-in exception to $2,500: manager. Above that:
  executive. Encoded in `approvalRoute()`.
- **Final QC closes at least 4 hours before a move-in**, with no unresolved
  life-safety, security, utility, sanitation or required-appliance blocker.
- **Never promise a Resident a reimbursement or an outcome without authority.**
  The drafted messages acknowledge and commit to a time; they never commit money.

## The security decision behind the engine

The source data contained **five instructions written to be obeyed by an
automated reader**, embedded in vendor notes, a quote footer, a building
auto-reply, a Resident web-form paste and an archived sheet. Three of them
pointed at the three most expensive errors available in the queue: keeping an
unlicensed vendor on an electrical emergency, approving an undiagnosed $5,900
replacement, and recording access as confirmed when the building had refused it.

**This is why there is no language model in the triage path.** A model reading
vendor-supplied free text is exactly the surface those instructions attack. The
engine is deterministic, inspectable, and cannot be talked out of a licensing
rule. `findInjections()` quarantines that text *before* any analysis runs, and
the UI shows the operator what was removed.

If you add AI anywhere, add it **outside** the decision path — polishing a draft
message, summarising a thread — never deciding a priority, a licence status or a
spend approval. `docs/ai-governance.md` has the full act / recommend / approve
split.

---

## Architecture

```
src/lib/domain/     facts and policy — no logic
  types.ts          domain types, LICENSED_TRADES
  homes.ts          18 Homes: access, keys, HOA, COI, limits, move-ins
  vendors.ts        17 vendors: trade, licence, zones, performance, capacity
  inventory.ts      field inventory; UNIQUE_ITEMS are the contention points
  queue.ts          the 19 open cases, for matching a new message
  policy.ts         SLA clauses, priority rules, trades, thresholds

src/lib/triage/
  engine.ts         raw message -> structured work order
  conflicts.ts      what a change breaks, across the board
  engine.test.ts    regressions; run with `npm test`

src/app/            Next.js App Router
  resident/         intake surface
  ops/              back office
  api/              route handlers
```

`triage(text, forcedHomeId?)` returns a complete `TriageResult`: matched case
with its evidence, priority with the policy clause it rests on, trade, resource
type, containment separated from repair, access plan, missing facts, risk flags,
approval route, ranked vendors with the excluded ones and why, a drafted reply,
and the next operating action.

`standingConflicts(cases)` audits the whole board. `candidateImpact(cases, result)`
reports what committing one new case would break. **Neither re-plans anything** —
that is deliberate. Re-planning the 72 hours is the manager's job; not being
surprised is the tool's.

---

## Six bugs already found and fixed — do not reintroduce them

Each has a regression test in `engine.test.ts`.

| Bug | Why it happened | Test |
|---|---|---|
| A quoted Home ID marked an unrelated case a "confirmed" match — a garage door attached to an air-conditioning case | Conflated *identifying the Home* with *identifying the case*. A Home we manage can have a brand-new problem. **Only issue wording anchors a match.** | "a new issue at a known Home does not attach" |
| "No smoke" read as smoke | Hazard words matched inside negations. `NEGATED_HAZARD` strips them before any rule fires. | "negated hazards do not fire their rule" |
| Water through a light fixture graded P1 | Containment was one list, so "I turned off the breaker" silenced a water rule. Containment is now **trade-specific**. | "water through a light fixture is P0" |
| A dishwasher matched the washer case | `/washer/` matches inside "dishwasher". Word boundaries matter. | "a dishwasher does not match the washer case" |
| A vendor progress note read as a Resident request | Type detection only looked for "we...". | "a crew note is classified as a vendor update" |
| "Can your handyman fix both?" passed silently on licensed work | The request itself needed a flag, not just the assignment. | "a generalist request on licensed work is flagged" |

They share one root cause: **inferring identity from partial overlap.** Watch for
it when adding any new matching or classification.

---

## How to work in this repo

- **Run `npm test` after any change to `src/lib`.** It is fast and it is the
  only thing standing between a refactor and a silent regression.
- Domain facts live in `src/lib/domain` and nowhere else. No Home, vendor,
  threshold or policy string should be hardcoded in a component.
- Every priority the UI shows must display the **rule id and the policy clause**
  it rests on. Traceability is a product feature, not debug output — an operator
  overriding the engine needs to see what they are overriding.
- When the engine cannot determine something, the UI says so plainly and names
  what is missing. It never guesses and never presents a guess as a fact.
- Vendors are ranked on first-visit resolution, never price. The four cheapest
  vendors in this network are also the four worst at resolving on the first
  visit, which is where the real cost sits.

## Vocabulary

**COI** Certificate of Insurance — proof a vendor carries liability cover.
Buildings require it hours in advance; it is a silent blocker that lives on the
Home, not the case.
**QC** Quality control — Belong's own functional verification before handover.
**Turnover** preparing a Home between Residents. **Onboarding** bringing a new
Home into the portfolio. **Containment** stopping harm without fixing the fault.
**First-visit resolution** share of jobs resolved in one visit — the best
predictor of true cost.

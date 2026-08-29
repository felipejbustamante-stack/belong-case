# Build plan

Ordered so that each step leaves something demonstrable. The domain logic in
`src/lib` is done and tested — these steps are almost entirely interface.

Run `npm test` after touching anything under `src/lib`.

---

## Done

- **Domain model** — 18 Homes, 17 vendors, field inventory, the 19-case open
  queue, and the policy clauses, in `src/lib/domain`.
- **Triage engine** — `triage(text)` returns a complete work order. 21 regression
  tests, including the six bugs found by testing on unseen messages.
- **Conflict engine** — `standingConflicts()` audits the board;
  `candidateImpact()` reports what committing a case would break.
- **Resident intake** — `/resident`, posting to `/api/requests`.
- **Ops inbox** — `/ops`, triaging every message on read and showing the work
  order beside the original text.

---

## 1. Case board — `/ops/board`

The 19 cases as cards, filterable by workstream, risk and open/closed. Each card
carries the reassessed priority, the owner, the next action with its target time,
and an expandable plan detail (rationale, assignment, access plan, dependencies,
cost, communication, fallback).

Editable inline: **status** and **owner**. Both write to the decision log through
`updateCase()`.

Above the filters, a **Risk to the plan** panel driven by `standingConflicts()`,
open by default when anything is blocking. On the seeded board it reports four
blocking conflicts, including a paint crew committed to three move-ins with
capacity for two.

## 2. Commit from the inbox

The inbox already computes the impact. Add the two actions:

- **Log as an update to \<case\>** when the match is confirmed or strong — keeps
  one case instead of two. This is the de-duplication the inherited queue lacked.
- **Open a new case** otherwise, seeded from the triage result.

Both are human actions. Nothing writes to the board automatically — that boundary
is the governance model, not a limitation.

## 3. Coordinator view — `/ops/me`

Pick a coordinator, see only their cases, their load against practical capacity
(`COORDINATOR_CAPACITY`), and today's deadlines in time order. This is what turns
the board from something watched into something worked.

Surface over-capacity from the same conflict engine rather than recomputing it.

## 4. Metrics — `/ops/metrics`

The seven measures from the operating system, computed over real system data:

1. P0 and P1 qualified arrival within target, %
2. First-visit resolution, %
3. Repeat repair within 60 days, %
4. Committed move-ins met without a QC exception, %
5. Failed-access visits as a share of dispatches, %
6. Median time to containment, P0 and P1
7. Cost per resolved case, and share of spend above the Home limit

Some need events the model does not record yet (arrival, containment, dispatch
outcome). Add those as timestamps on the case rather than inventing a metric that
looks right and measures nothing.

Do **not** add cases-closed-per-day or time-to-first-reply. Both improve by
closing fast and answering with nothing.

## 5. The access gate

The gate that was missing. Before a case can move to `Dispatched`, require:
access confirmed, COI filed **and receipted** where the Home needs one, building
or HOA requirement met, licence verified for the trade, parts on hand.

Block the transition in the UI and say which condition is unmet. Every failed
trip in the source data traces back to this gate not existing.

## 6. The verification owner

A case cannot reach `Verified` without a named person and a functional check.
Vendor completion is not verification. Three committed move-ins in the source
data had no verification owner at all.

## 7. Real persistence

`src/lib/store.ts` is file-backed so the product runs with zero setup. Swap it
for Postgres when it needs to be shared: keep the exported function signatures,
change the implementation. Nothing else imports the storage layer.

## 8. Deploy

Vercel. Needs step 7 first — the file store does not survive a serverless
filesystem.

---

## Ideas worth considering, not yet decided

- **Channel simulation.** Let a demo replay the seven supplied intake messages
  arriving over time, so the inbox fills while someone watches.
- **An override that must be justified.** Where an operator disagrees with the
  engine, let them change it — but require a reason, and log both. The disagreements
  are the training data for the rules.
- **The 08:00 release list.** The eight expiring vendor holds as a countdown, since
  the whole week is decided in that window.

# Belong Field Operations

A Resident intake surface and a field-operations back office, built on a
deterministic triage engine.

A Resident writes what is wrong in their own words. The engine matches it
against the open queue, sets a priority against the policy clause it rests on,
identifies the licensed trade, separates containment from repair, checks whether
anyone can actually get in, names what is missing, ranks vendors, drafts a reply,
and reports what committing the case would break. A person decides everything
after that.

*A case-study artifact. Every Home, Resident, employee, vendor, cost and event
here is fictional, and no Belong brand asset is reproduced.*

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 48 regression tests on the engine and the gates
```

No database, no environment variables, no accounts. State lives in `.data/`
(gitignored) so the product runs the moment it is cloned.

## The demo, in order

Screenshots of each step are in [`docs/screenshots/`](docs/screenshots).
`npm run smoke` drives this whole path against a running server, in light and
dark, and fails on any console error.

1. **`/`** — what the artifact does, and the three structural failures it closes.
2. **`/resident`** — report the sparking outlet. The inbox grades it P0 citing
   the rule that fired, demands a licensed electrician, separates the breaker
   being off from the repair, and does not read "No smoke" as smoke.
3. **The quarantine.** Replay `AI-07` from the presenter controls: an
   instruction planted for an automated reader is removed before any analysis
   runs, and the operator is shown exactly what was taken out.
4. **The duplicate.** Replay `AI-06` — the same ceiling stain, arriving by phone
   after the app. It matches the open case and becomes an update on it. One
   case, not two.
5. **`/ops/board`** — the risks to the plan, a case end to end, and the access
   gate refusing a dispatch with the unmet condition named.
6. **Change availability.** Take out a vendor, cut a crew, lose a coordinator.
   The board says what that newly breaks and what was already true.
7. **`/about`** — where AI acts, where it recommends, and where a human must
   approve.

The presenter controls (top of any `/ops` screen) also take a message pasted in
live and triage it on the spot, and reset the world to Monday 08:00 between
rehearsals.

## Where to look

| | |
|---|---|
| **`CLAUDE.md`** | Read this first. Domain rules, the decisions behind the engine, and six bugs that must not come back. |
| `docs/EXECUTION-PLAN.md` | The build brief this product was executed from. |
| `docs/DEMO-GUIA.md` | Presentation guide (Spanish): decisions to defend, the traps in the source data, the demo script. |
| `docs/ai-governance.md` | Act / recommend / approve, and the controls required before live use. |
| `src/lib/domain/` | Facts and policy — Homes, vendors, inventory, the open queue, SLA clauses, the supplied test inputs. No logic. |
| `src/lib/triage/engine.ts` | `triage(text)` → a complete work order. |
| `src/lib/triage/conflicts.ts` | What a change breaks, across the board. |
| `src/lib/ops/gates.ts` | The access gate and the verification owner. |
| `scripts/smoke.mjs` | The demo path as an executable test. |

## Four things that make this different from a ticket queue

**It refuses work it is not allowed to do.** Electrical, HVAC, plumbing,
roofing, pool barrier and water mitigation require a licensed vendor. There is
no override path anywhere in the product — not an admin flag, not a force
option. In the source data an electrical emergency with a burning odour had been
booked to a vendor explicitly unlicensed for electrical work.

**It treats third-party text as untrusted.** The source data contained five
instructions written to be obeyed by an automated reader, three of which pointed
at the three most expensive errors available. The engine quarantines that text
before it analyses anything and shows the operator what it removed. This is also
why there is no language model in the decision path.

**Nothing is dispatched or verified on an assumption.** A visit cannot be booked
until access, insurance, building rules, licence and parts are each confirmed by
a person who says what they checked. A case cannot be verified without a named
Belong person and a functional check — a vendor reporting completion is not
verification.

**It reports what a change breaks, and stops there.** Committing a case tells
you the recommended vendor is already at capacity, or that the containment needs
equipment another case is holding, or that the Home hands over in two days. It
does not re-plan the week. Re-planning is the manager's job; not being surprised
is the tool's.

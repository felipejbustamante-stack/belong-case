# Belong Field Operations

A Resident intake surface and a field-operations back office, built on a
deterministic triage engine.

A Resident writes what is wrong in their own words. The engine matches it against
the open queue, sets a priority against the policy clause it rests on, identifies
the licensed trade, separates containment from repair, checks access, names what
is missing, ranks vendors, drafts a reply, and reports what committing the case
would break. A person decides everything after that.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 21 regression tests on the engine
```

No database, no environment variables, no accounts. State lives in `.data/`
(gitignored) so the product runs the moment it is cloned.

## Where to look

| | |
|---|---|
| **`CLAUDE.md`** | Read this first. Domain rules, the decisions behind the engine, and six bugs that must not come back. |
| `docs/build-plan.md` | What is done and the order to build the rest in. |
| `src/lib/domain/` | Facts and policy — Homes, vendors, inventory, the open queue, SLA clauses. No logic. |
| `src/lib/triage/engine.ts` | `triage(text)` → a complete work order. |
| `src/lib/triage/conflicts.ts` | What a change breaks, across the board. |
| `src/app/resident/` | The intake surface. |
| `src/app/ops/` | The back office. |

## Three things that make this different from a ticket queue

**It refuses work it is not allowed to do.** Electrical, HVAC, plumbing, roofing,
pool barrier and water mitigation require a licensed vendor. There is no override
path anywhere in the product — not an admin flag, not a force option. In the
source data an electrical emergency with a burning odour had been booked to a
vendor explicitly unlicensed for electrical work.

**It treats third-party text as untrusted.** The source data contained five
instructions written to be obeyed by an automated reader, three of which pointed
at the three most expensive errors available. The engine quarantines that text
before it analyses anything and shows the operator what it removed. This is also
why there is no language model in the decision path.

**It reports what a change breaks, and stops there.** Committing a case tells you
the recommended vendor is already at capacity, or that the containment needs a
piece of equipment another case is holding, or that the Home hands over in two
days. It does not re-plan the week. Re-planning is the manager's job; not being
surprised is the tool's.

## Status

The domain model, the triage engine, the conflict engine, the Resident intake
surface and the ops inbox are working. The case board, coordinator view and
metrics are scaffolded — see `docs/build-plan.md`.

---

All Homes, Residents, employees, vendors, costs and events are fictional.

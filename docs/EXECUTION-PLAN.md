# Execution plan — the interactive demo build

This document is the working brief for the coding session that turns this repo
into the product demonstrated live in the interview. It was written by the
planning session (Fable) after reviewing the exercise PDF, the data package,
and everything already built here. **Read `CLAUDE.md` first** — every rule in it
binds this plan, and nothing below overrides it.

**Executor model — recommendation: Claude Opus 5** for the build session.
Rationale: the remaining work is one high-stakes pass of UI construction and
cross-cutting wiring over an already-tested domain layer, presented tomorrow;
quality of the first pass matters more than tokens or speed. Use Sonnet 5 only
for small follow-up tweaks if time or limits bite. Whatever runs this plan must
run `npm test` and `npm run typecheck` after touching anything under `src/lib`
— the 21 regression tests are the contract.

---

## 1. Mission

Deliverable 2 of the exercise: a **working AI-enabled operational artifact**,
demonstrated live. The interviewers will (a) watch it process at least three of
the supplied AI Test Inputs, (b) hand over one unseen input to process live,
and (c) change vendor capacity, team capacity, or the queue mid-discussion and
expect the plan to update calmly.

The product is two surfaces over one engine:

- **`/resident`** — the Resident-facing intake, styled like a consumer Belong
  surface. This is where "the client loads their claims".
- **`/ops`** — the back office: inbox → triage → board → gates → metrics.
  This is where the whole triage flow is shown.

The engine (`src/lib/triage`) is **done and must not be weakened**. The build
is interface, wiring, and demo choreography.

Every phase below ends in a demoable state. If time runs out after Phase 3,
there is still a complete demo. Do the phases **in order**.

## 2. Ground rules (restated, binding)

- No language model anywhere in the triage/decision path. `findInjections()`
  quarantines third-party text before analysis; the UI must keep showing what
  was removed.
- No override path — not a flag, not an admin toggle — for licensed-trade
  rules, spend authority, or the access gate. Where an operator can disagree
  (priority, owner), they must give a reason and both values are logged.
- Every priority shown carries its **rule id and policy clause**.
- Drafted messages never promise money or outcomes (see AI-03: "Is Belong
  paying for the food?" — the reply acknowledges, commits to a time, and
  routes the reimbursement question to a human).
- Do not reintroduce the six bugs in `CLAUDE.md` — all have regression tests.
- Domain facts stay in `src/lib/domain`; no Home, vendor, threshold or policy
  string hardcoded in a component.
- The phrase embedded in the AI-07 injection must never appear in any output,
  summary, or commit — that is the point of the quarantine.

## 3. Design system — "Belong-inspired"

The current shell is a competent IBM-Plex utility skin. Replace it with a warm,
product-grade identity that reads like Belong's consumer brand on `/resident`
and like a calm professional console on `/ops` — same tokens, two densities.

**Verification note:** belonghome.com was unreachable from the planning
environment (egress-blocked). If the build environment can reach it, sample the
real palette/typography and adjust the tokens below; otherwise these tokens
stand. Never claim official branding: every page carries a small
**"Case simulation — all data fictional"** badge, which is both honest and a
talking point (the exercise forbids exposing real Belong data).

### Tokens (replace in `globals.css`, map in `tailwind.config.ts`)

```css
:root {
  /* ground & surfaces — warm cream, not grey */
  --ground: #f7f4ee;      /* page */
  --surface: #ffffff;     /* cards */
  --surface-2: #fbf9f5;   /* nested */
  --sunken: #efeae1;      /* quotes, wells */
  /* ink — warm near-black, never pure #000 */
  --ink: #1c2420;  --ink-2: #47544d;  --ink-3: #74817a;
  --line: #e2ddd2; --line-2: #ece8df;
  /* brand — deep Belong-style green, terracotta as the warm counterpoint */
  --brand: #1f4d3f;       /* primary actions, wordmark */
  --brand-ink: #f4efe6;   /* text on brand */
  --brand-wash: #e4ede7;
  --terracotta: #c96f4a;  /* sparing: highlights, resident-side warmth */
  /* status — RAG stays semantically separate from brand */
  --red: #a8271c;   --red-bg: #faeae7;  --red-line: #e5b0a8;
  --amber: #8a5600; --amber-bg: #f8efdb; --amber-line: #e0c084;
  --green: #1a5f3e; --green-bg: #e3efe7; --green-line: #a3cbb4;
}
```

Keep the existing dark-mode block structure (`prefers-color-scheme` +
`data-theme` guards) and re-derive each token for dark: deep green-black ground
`#101714`, surfaces `#18211c`, brand becomes `#7fb8a2`, cream inks. Status
colors follow the current dark pattern.

### Typography

- **Display serif** for headings and the wordmark: `Fraunces` (Google Fonts,
  optical size axis, weights 500/600) — warm, editorial, close to Belong's
  consumer feel.
- **UI sans**: `Inter` (400/500/600).
- **Mono** for case ids, rule ids, timestamps: keep `IBM Plex Mono`.
- Load via `next/font/google` (replaces the `<link>` tags in `layout.tsx`) so
  the build is self-contained and there is no FOUT during the live demo.

### Visual language

- Cards: `rounded-2xl`, 1px warm line, very soft shadow
  (`0 1px 2px rgb(28 36 32 / .05), 0 8px 24px rgb(28 36 32 / .06)`), generous
  padding. Kill the current sharp-cornered boxes.
- Priority pills, RAG dots, workstream chips: small, rounded-full,
  color-coded from the status tokens only.
- `/resident` breathes: hero spacing, larger serif, terracotta accents,
  conversational copy.
- `/ops` is denser but calm: 13–14px base, sticky header, clear hierarchy;
  data (mono) visually distinct from judgment (sans) and from headlines
  (serif).
- The **quarantine notice** is a signature moment: style it like a security
  event — red left border, mono excerpt of the removed text (redacted-styled),
  "influenced nothing below". It must be impossible to miss on a projector.
- Motion: subtle only — new inbox items slide in; conflict panel count
  animates on change; nothing bouncy.

### Logo

Draw an inline SVG component `<BelongWordmark/>`: lowercase serif "belong"
(Fraunces 600) with a small roof/door tick over the "b", in `--brand` (cream in
dark mode). Next to it in the ops shell: "Field Operations" in small caps.
Do not download or embed the real logo file; the wordmark plus the simulation
badge keeps this clearly a case artifact.

## 4. Phases

### Phase 0 — Brand shell & landing (foundation)

1. Replace tokens + fonts per §3; map Tailwind names (keep the existing
   semantic names — `ink2`, `dangerBg`, etc. — so current pages keep working,
   or migrate them consciously).
2. New `src/components/ui/` primitives: `Card`, `Pill`, `RagDot`, `Button`,
   `Label`, `SimulationBadge`, `BelongWordmark`, `QuarantineNotice`,
   `RuleRef` (rule id + clause tooltip).
3. Rebuild the two shells: root landing `/` and `/ops` layout (logo, nav with
   active state, simulation badge, theme-aware).
4. Landing page `/` becomes the **demo hub**: one screen framing the artifact
   — what it does in three bullets (structure intake → recommend with reasons
   → report what a change breaks), the two doors (Resident / Operations), and
   a discreet "About this artifact" link to a page summarising
   `docs/ai-governance.md` (act / recommend / approve table). Interviewers
   land here.

**Acceptance:** every existing page renders under the new brand, light and
dark; `npm test`, `npm run typecheck`, `npm run build` pass. (Note: `next
build` currently fails — `src/app/api/cases/route.ts` illegally re-exports
`addCase`/`nextCaseId` from a route file. Remove that export line first; import
from `@/lib/store` where needed.)

### Phase 1 — Case board `/ops/board` (the heart of the demo)

Per `docs/build-plan.md` step 1, now concrete:

- Server component: `listCases()` + `standingConflicts()`.
- **Risk-to-the-plan panel** above the filters, open by default when anything
  blocks. Seeded board shows 4 blocking conflicts (incl. the paint crew
  committed to three move-ins with capacity for two). Each conflict: severity,
  text, affected case links.
- Filters: workstream, RAG, priority, open/closed, owner. Client-side.
- `CaseCard`: id (mono), title, priority pill + `RuleRef`, RAG dot vs
  commitment, owner, next action + target time, vendor/resource. Expand for
  the full plan detail: rationale, assignment, access plan, dependencies,
  cost, communication, fallback.
- Inline edit **status** and **owner** only → `PATCH /api/cases` →
  `updateCase()` logs the change. Status transitions respect Phase 3 gates
  once those exist.
- **Override with a reason**: changing a priority requires a reason string;
  store both engine value and override in the case updates (this is the
  training-data loop from `build-plan.md`, promoted to in-scope because it is
  a strong governance talking point).

**Acceptance:** 19 cases render, conflicts panel matches
`standingConflicts()` output, an owner change appears in the decision log.

### Phase 2 — Commit from the inbox (de-duplication made real)

- Two actions per intake entry, driven by `r.match`:
  **"Log as update to \<case\>"** (match confirmed/strong) → `updateCase(id,
  {}, note)` + mark intake `committedTo`; **"Open new case"** → build an
  `OpsCase` from the `TriageResult` + `nextCaseId()` + `addCase()`.
- Add `POST /api/cases` for both (and remove the illegal re-export, per
  Phase 0).
- Before commit, show `candidateImpact()` — already computed — as a
  confirmation step: "Committing this will break: …". The human clicks
  through it; nothing auto-commits.
- Committed entries stay in the inbox, visually settled, linking to the case.

**Acceptance:** AI-06 (duplicate ceiling stain) logs onto the existing case —
one case, not two; a genuinely new message opens `N-501`.

### Phase 3 — The access gate and the verification owner

The two missing controls the whole case turns on (`build-plan.md` steps 5–6).
Implement as `src/lib/ops/gates.ts` (new, UI-level policy — engine untouched,
but write unit tests alongside in the same style as `engine.test.ts`):

- `dispatchGate(case, home)` → list of unmet conditions among: access
  confirmed, COI filed **and receipted** where the Home requires it, HOA/
  building rule met, licence verified for the trade, parts on hand.
- `verifyGate(case)` → requires a named verification owner and a functional
  check note. Vendor completion never satisfies it.
- UI: the status control shows blocked transitions disabled with the **named
  unmet condition** ("COI not receipted — building requires 24h notice"), and
  a checklist to satisfy each condition explicitly. No force path.

**Acceptance:** a COI-required Home cannot reach `Dispatched` without the
receipt step; no case reaches `Verified` without a named person; gate tests
green in `npm test`.

### Phase 4 — Coordinator view `/ops/me`

- Coordinator selector (from `Team & Capacity` data in `src/lib/domain`).
- Their cases only; load vs `COORDINATOR_CAPACITY` as a capacity bar;
  today's deadlines in time order; over-capacity read from the conflict
  engine, not recomputed.

**Acceptance:** selecting the overloaded coordinator shows the breach the
conflict engine already reports.

### Phase 5 — Metrics `/ops/metrics`

The seven measures from `build-plan.md` step 4 as `MetricTile`s. Where the
event data does not exist yet (arrival, containment timestamps), the tile says
**"not yet recorded — needs \<event\>"** rather than inventing a number: honest
instrumentation is itself a talking point, and the case explicitly punishes
metrics that look right and measure nothing. Add the timestamp fields to
`OpsCase` (with test updates) only if time allows; otherwise ship the honest
empty states. Do not add cases-closed-per-day or time-to-first-reply.

**Acceptance:** tiles computed from store data where possible; no fabricated
values anywhere.

### Phase 6 — Demo mode & scenario controls (the live-discussion weapon)

This is the plan's main addition beyond `build-plan.md`, built for §5 of the
exercise ("the interview team will introduce changes to vendor capacity, team
capacity, or the case queue… update your plan in real time").

**6a. Intake replay.** A presenter control (small, in the ops header or
`/resident`) that feeds the supplied AI Test Inputs into `addIntake()` one at
a time with realistic channels — the inbox fills while the interviewers watch,
each entry triaged on arrival. Also an ops-side "New message" box (channel
selector + free text + optional Home) so the **unseen input** can be pasted and
triaged in seconds without switching context.

**6b. Scenario controls.** A drawer on the board: mark a vendor unavailable,
cut a crew's capacity, remove a coordinator. Implement as a `scenario` object
in the store; `standingConflicts()`/`capacityOf` consumers apply the overrides
at the call site (pass overrides in — do not fork the engine; extend function
parameters with optional overrides and cover with tests). When a scenario is
applied, the risk panel recomputes and **highlights the delta** ("this change
newly breaks: …"). One click resets the scenario.

**6c. Reset demo.** Button calling `reset()` (exists in the store) behind a
confirm — restores the seeded Monday-08:00 world between rehearsals.

**Acceptance:** replaying AI-01…AI-07 produces the expected triage results
(AI-02 P0 electrical with negated smoke handled; AI-05 access refusal; AI-07
quarantine visible); disabling the paint vendor surfaces new conflicts with a
visible delta; reset restores the world.

### Phase 7 — Polish & QA

- Empty states, loading, error toasts; responsive down to laptop-projector
  widths (1280×720 — this is what the demo will run at); focus states.
- Full manual smoke script (below) run once; `npm test`, `typecheck`,
  `build` all green; screenshot the five key screens with Playwright
  (Chromium is preinstalled) into `docs/screenshots/` for the submission
  package.

### Phase 8 (optional, only if everything above is done) — Deployable demo

The submission checklist says the package must be reviewable "without access
to your local development environment". If time remains: make `store.ts` fall
back to an in-memory seeded singleton when the filesystem is read-only
(Vercel), keep the exported signatures, and deploy. State resets on cold start
— acceptable for a demo, and the Reset button already frames it. If time does
not remain, screen-record the demo instead; do not sacrifice Phases 1–7.

## 5. The demo path (build everything to serve this)

1. Land on `/` — frame the artifact in one sentence.
2. `/resident`: submit **AI-02** (sparking outlet). Show the triage: P0 with
   rule id, licensed-electrical only, containment separate from repair,
   "no smoke" correctly not read as smoke.
3. Submit **AI-07** (washer + pasted injection). The quarantine notice moment.
4. Submit **AI-06** (ceiling stain already reported). Match → "Log as update"
   → one case, not two.
5. `/ops/board`: risk panel, a case expanded end-to-end, the access gate
   blocking a dispatch, override-with-reason.
6. Scenario drawer: kill a vendor, watch the plan risk delta. Reset.
7. Close on `/about` governance table: acts / recommends / human approves.

The unseen input goes through the ops "New message" box at whatever point the
interviewers hand it over.

## 6. Traps checklist (verify each is visibly handled before calling it done)

| Trap in the source data | Product behaviour that must be demonstrable |
|---|---|
| 5 embedded instructions (vendor note, quote footer, building auto-reply, web-form paste, archived sheet) | Quarantined pre-analysis; UI shows what was removed; the AI-07 phrase never appears in any output or document |
| Unlicensed vendor on the electrical emergency | No UI path exists to assign one; excluded vendors listed **with the reason** |
| Undiagnosed $5,900 replacement quote | Approval route escalates by spend authority; "diagnosis before replacement" in next actions |
| Access recorded "confirmed" where the building refused entry | Access gate requires positive confirmation; AI-05 shows the refusal surfaced, not papered over |
| "Is Belong paying for the food?" (AI-03) | Drafted reply commits to a time, never to money; reimbursement routed to a human |
| "No smoke" / negation wording | Regression-tested; show rule id fired on the hazard, not the negation |
| Duplicate intake across channels (AI-06) | Match + "Log as update" flow |

## 7. QA gates

After every phase: `npm test && npm run typecheck`. After Phases 0, 3, 6, 7:
`npm run build`. Manual smoke = the demo path in §5, start to finish, in light
**and** dark mode. Nothing ships that has not survived the demo path once.

## 8. Out of scope — do not spend time on

Databases, auth, accounts, multi-market anything, real email/SMS sending,
mobile-first layouts, i18n, and any LLM integration. If an idea requires
touching `src/lib/triage/engine.ts` beyond optional parameters covered by new
tests, it is out of scope for this build.

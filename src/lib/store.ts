/**
 * Case store.
 *
 * Deliberately a file-backed JSON store so `npm install && npm run dev` works
 * with zero setup — which matters when the product has to be demonstrated.
 * Everything goes through this interface, so swapping in Postgres later is a
 * change to this file and nothing else. See docs/build-plan.md, step 7.
 */

import fs from "node:fs";
import path from "node:path";
import { SEED_CASES } from "./domain/cases";
import type { OpsCase, CaseUpdate, Channel, Scenario } from "./domain/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "cases.json");

export interface Intake {
  id: string;
  receivedAt: string;
  channel: Channel;
  /** Free text exactly as it arrived. Never normalised before triage. */
  body: string;
  reporter?: string;
  homeId?: string;
  /** Set once a coordinator commits it to the board. */
  committedTo?: string;
}

interface DB {
  cases: OpsCase[];
  intake: Intake[];
  log: { at: string; kind: string; caseId?: string; text: string }[];
  /** A what-if laid over the real board. Never written into the domain data. */
  scenario?: Scenario;
}

export const EMPTY_SCENARIO: Scenario = {
  vendorsDown: [],
  vendorCapacity: {},
  coordinatorsOut: [],
};

export const scenarioIsActive = (s: Scenario | undefined | null): boolean =>
  !!s &&
  (s.vendorsDown.length > 0 ||
    s.coordinatorsOut.length > 0 ||
    Object.keys(s.vendorCapacity).length > 0);

function load(): DB {
  try {
    if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, "utf8")) as DB;
  } catch {
    // fall through to a fresh seed rather than crashing the request
  }
  return { cases: structuredClone(SEED_CASES), intake: [], log: [] };
}

function save(db: DB) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

export const getDb = (): DB => load();

export function listCases(): OpsCase[] {
  return load().cases;
}

export function listIntake(): Intake[] {
  return load().intake.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export function listLog() {
  return load().log;
}

export function addIntake(input: Omit<Intake, "id" | "receivedAt">): Intake {
  const db = load();
  const entry: Intake = {
    ...input,
    id: `IN-${Date.now().toString(36).toUpperCase()}`,
    receivedAt: new Date().toISOString(),
  };
  db.intake.unshift(entry);
  db.log.unshift({ at: entry.receivedAt, kind: "Intake", text: `${entry.channel}: ${entry.body.slice(0, 120)}` });
  save(db);
  return entry;
}

const LOGGED_FIELDS = {
  status: "Status",
  owner: "Owner",
  priority: "Priority override",
} as const;

export function updateCase(id: string, patch: Partial<OpsCase>, note?: string): OpsCase | null {
  const db = load();
  const c = db.cases.find((x) => x.id === id);
  if (!c) return null;
  const before = { ...c };

  // Preserve the engine's grade the first time a human disagrees with it.
  if (patch.priority && patch.priority !== c.priority && !c.enginePriority) {
    c.enginePriority = c.priority;
  }

  Object.assign(c, patch);
  for (const k of Object.keys(LOGGED_FIELDS) as (keyof typeof LOGGED_FIELDS)[]) {
    if (k in patch && before[k] !== c[k]) {
      db.log.unshift({
        at: new Date().toISOString(),
        kind: LOGGED_FIELDS[k],
        caseId: id,
        text: `${String(before[k])} → ${String(c[k])}`,
      });
    }
  }
  if (note) {
    const u: CaseUpdate = { at: new Date().toISOString(), text: note };
    c.updates.unshift(u);
    db.log.unshift({ at: u.at, kind: "Update", caseId: id, text: note.slice(0, 160) });
  }
  save(db);
  return c;
}

export function getIntake(id: string): Intake | undefined {
  return load().intake.find((i) => i.id === id);
}

/**
 * Records that a human decided where an intake message goes. The message stays
 * in the inbox afterwards — a de-duplicated report that vanishes is
 * indistinguishable from one that was ignored.
 */
export function commitIntake(intakeId: string, caseId: string): Intake | null {
  const db = load();
  const entry = db.intake.find((i) => i.id === intakeId);
  if (!entry) return null;
  entry.committedTo = caseId;
  save(db);
  return entry;
}

export function addCase(c: OpsCase): OpsCase {
  const db = load();
  db.cases.unshift(c);
  db.log.unshift({ at: new Date().toISOString(), kind: "New case", caseId: c.id, text: `Opened from intake. ${c.priority}.` });
  save(db);
  return c;
}

/** Next id for a case opened from intake. Existing queue ids are preserved. */
export function nextCaseId(): string {
  const nums = load().cases
    .map((c) => parseInt(String(c.id).split("-")[1] ?? "", 10))
    .filter((n) => !Number.isNaN(n) && n >= 500);
  return `N-${Math.max(500, ...nums) + 1}`;
}

export function getScenario(): Scenario {
  return load().scenario ?? structuredClone(EMPTY_SCENARIO);
}

export function setScenario(s: Scenario): Scenario {
  const db = load();
  db.scenario = s;
  db.log.unshift({
    at: new Date().toISOString(),
    kind: "Scenario",
    text: scenarioIsActive(s)
      ? `Applied: ${describeScenario(s).join("; ")}`
      : "Cleared — back to the real board",
  });
  save(db);
  return s;
}

/** Plain sentences for the log and the banner. */
export function describeScenario(s: Scenario): string[] {
  const out: string[] = [];
  for (const v of s.vendorsDown) out.push(`${v} unavailable`);
  for (const [v, n] of Object.entries(s.vendorCapacity)) out.push(`${v} cut to ${n}/day`);
  for (const c of s.coordinatorsOut) out.push(`${c} out`);
  return out;
}

/** Back to Monday 08:00, scenario included. Used between rehearsals. */
export function reset() {
  save({ cases: structuredClone(SEED_CASES), intake: [], log: [] });
}

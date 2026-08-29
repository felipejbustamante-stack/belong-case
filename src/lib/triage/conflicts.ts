/**
 * CONFLICT ENGINE
 *
 * The board does not re-plan the 72 hours. It reports what a change BREAKS and
 * leaves the re-planning to a person: re-planning is the manager's job, not
 * being surprised is the tool's.
 *
 * Every finding names the rule and the evidence behind it.
 */

import { VENDORS, capacityOf } from "../domain/vendors";
import { homeById } from "../domain/homes";
import { UNIQUE_ITEMS } from "../domain/inventory";
import { COORDINATOR_CAPACITY, IMMOVABLE_COMMITMENTS } from "../domain/policy";
import {
  ZONE,
  type Conflict,
  type OpsCase,
  type Scenario,
  type TriageResult,
  type Vendor,
} from "../domain/types";

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Scenario overrides are applied here, at the point of use, rather than by
 * mutating the vendor or team data. Clearing the scenario therefore restores
 * the real world exactly — there is no state to unwind.
 */
function effectiveCapacity(v: Vendor, scenario?: Scenario): number {
  if (scenario?.vendorsDown.includes(v.name)) return 0;
  const override = scenario?.vendorCapacity[v.name];
  return override ?? capacityOf(v);
}

function coordinatorCapacity(owner: string, scenario?: Scenario): number | undefined {
  if (scenario?.coordinatorsOut.includes(owner)) return 0;
  return COORDINATOR_CAPACITY[owner];
}

/** Vendors named anywhere in a case's assignment text. */
export function vendorsIn(text: string): Vendor[] {
  const t = text ?? "";
  return VENDORS.filter((v) => new RegExp(escapeRx(v.name.split(" ")[0]), "i").test(t));
}

export const openCases = (cases: OpsCase[]): OpsCase[] =>
  cases.filter((c) => !["Closed", "Verified"].includes(c.status));

const rank = { high: 0, med: 1, low: 2 } as const;

/* ------------------------------------------ standing conflicts on the board */

export function standingConflicts(cases: OpsCase[], scenario?: Scenario): Conflict[] {
  const open = openCases(cases);
  const out: Conflict[] = [];
  const add = (severity: Conflict["severity"], kind: string, text: string, caseIds: string[] = []) =>
    out.push({ severity, kind, text, caseIds });

  /* owners */
  const byOwner: Record<string, string[]> = {};
  for (const c of open) (byOwner[c.owner] ??= []).push(c.id);

  if (byOwner["Unassigned"]?.length) {
    const n = byOwner["Unassigned"].length;
    add("high", "Unassigned work",
      `${n} open case${n > 1 ? "s have" : " has"} no owner. Nothing moves without a named owner.`,
      byOwner["Unassigned"]);
  }
  for (const [owner, ids] of Object.entries(byOwner)) {
    if (owner === "Unassigned") continue;
    const cap = coordinatorCapacity(owner, scenario);
    if (cap === 0) {
      add("high", "Coordinator unavailable",
        `${owner} is out and holds ${ids.length} open case${ids.length > 1 ? "s" : ""}. Every one needs a named replacement owner before it can move — an unowned case does not progress on its own.`, ids);
      continue;
    }
    if (!cap) continue;
    if (ids.length > cap) {
      add("high", "Coordinator over capacity",
        `${owner} holds ${ids.length} open cases against a practical capacity of ${cap}. Reassign ${ids.length - cap} or accept that the overflow will slip.`, ids);
    } else if (ids.length === cap) {
      add("med", "Coordinator at capacity",
        `${owner} is at their practical capacity of ${cap}. Any further case must go to someone else.`, ids);
    }
  }

  /* vendor day capacity */
  const byVendor: Record<string, string[]> = {};
  for (const c of open) for (const v of vendorsIn(c.assignment)) (byVendor[v.name] ??= []).push(c.id);

  for (const [name, ids] of Object.entries(byVendor)) {
    const v = VENDORS.find((x) => x.name === name)!;
    const cap = effectiveCapacity(v, scenario);

    if (scenario?.vendorsDown.includes(name)) {
      add("high", "Vendor unavailable",
        `${name} is unavailable and appears on ${ids.length} open case${ids.length > 1 ? "s" : ""}. Each needs a compliant alternative or a new date — and on licensed work a generalist is not an alternative.`, ids);
      continue;
    }
    const reduced = scenario?.vendorCapacity[name];
    const stated = reduced != null ? `${reduced}/day (reduced from ${v.capacity})` : v.capacity;

    if (ids.length > cap) {
      add("high", "Vendor over capacity",
        `${name} appears on ${ids.length} open cases against a stated capacity of ${stated}. At least ${ids.length - cap} cannot be served on the same day.`, ids);
    } else if (ids.length === cap && cap !== Infinity) {
      add("med", "Vendor at capacity",
        `${name} is fully committed at ${stated}. There is no room here for anything new today.`, ids);
    }
  }

  /* single-instance field inventory */
  for (const item of UNIQUE_ITEMS) {
    const claim = open.filter((c) =>
      item.pattern.test([c.assignment, c.action, c.dependencies, c.communication].join(" ")));
    if (claim.length > item.quantity) {
      add("high", "Field inventory contention",
        `${claim.length} cases rely on the ${item.key}, and there ${item.quantity === 1 ? "is only one" : `are only ${item.quantity}`} (${item.location}). Sequence them or source another unit.`,
        claim.map((c) => c.id));
    }
  }

  /* committed move-ins still carrying red work */
  for (const c of open) {
    const h = homeById(c.homeId);
    if (h?.moveIn && c.risk === "RED") {
      add("high", "Committed move-in at risk",
        `${c.homeId} hands over ${h.moveIn} and this case is still red. Final QC must complete at least 4 hours before handover, with no unresolved life-safety, security, utility, sanitation or required-appliance blocker.`, [c.id]);
    }
  }

  /* zones the network cannot serve */
  for (const c of open) {
    const h = homeById(c.homeId);
    if (h?.zone === "FL") {
      add("high", "No coverage in this zone",
        `${c.homeId} is in Fort Lauderdale, served by one vendor for paint and cleaning only. There is no licensed trade, locksmith, roofing, mitigation or photography cover there.`, [c.id]);
    }
    if (!h && c.homeId === "Unidentified") {
      add("high", "Home not identified",
        `${c.id} has no Home on file, so access rules, the approval limit and building requirements cannot be checked.`, [c.id]);
    }
  }

  /* single-source licensed trades */
  for (const name of ["BrightLine Electric", "FlowRight Plumbing"]) {
    const v = VENDORS.find((x) => x.name === name);
    if (!v) continue;
    const used = byVendor[name]?.length ?? 0;
    if (used >= effectiveCapacity(v, scenario)) {
      add("med", "Single-source trade fully committed",
        `${name} is the only ${v.trade} vendor available for most zones and is already at ${v.capacity}. A further ${v.trade} emergency today has no compliant fallback — a generalist is not one.`,
        byVendor[name] ?? []);
    }
  }

  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/* ------------------------------ what a candidate would break, before commit */

export function candidateImpact(
  cases: OpsCase[], r: TriageResult, attachTo?: string | null, scenario?: Scenario,
): Conflict[] {
  const open = openCases(cases);
  const out: Conflict[] = [];
  const add = (severity: Conflict["severity"], kind: string, text: string) =>
    out.push({ severity, kind, text, caseIds: [] });

  const zone = r.home?.zone ?? null;
  const rec = r.vendors.list[0];

  if (rec) {
    const used = open.filter((c) => vendorsIn(c.assignment).some((v) => v.name === rec.name)).length;
    const cap = effectiveCapacity(rec, scenario);
    if (scenario?.vendorsDown.includes(rec.name)) {
      add("high", "Recommended vendor is unavailable",
        `${rec.name} is the ranked recommendation but is unavailable in the current scenario. Pick the backup, or if none exists, this case has no compliant resource today.`);
    }
    if (used >= cap) {
      add("high", "Recommended vendor is full",
        `${rec.name} is already on ${used} open case${used > 1 ? "s" : ""} against a capacity of ${rec.capacity}. Booking this one makes the day undeliverable for at least one of them — pick the backup or move a case.`);
    } else if (used === cap - 1) {
      add("med", "Recommended vendor nearly full",
        `${rec.name} has one slot left today (${rec.capacity}). This case takes it, leaving no room for a further emergency in that trade.`);
    }
    if (!r.vendors.list[1]) {
      add("med", "No backup vendor",
        `${rec.name} has no second option for this trade in ${zone ? ZONE[zone] : "this zone"}. If they fail, there is no compliant alternative.`);
    }
  }

  if (r.priority.level === "P0") {
    add("med", "Arrives after the release window",
      "The eight vendor holds expire between 08:15 and 09:30. A P0 opened after that competes for whatever capacity is left rather than a held slot — confirm availability before promising an arrival time.");
  }

  add("med", "No owner yet",
    "New cases open unassigned. Give it an owner on the board before it can move — and check that owner is not already at capacity.");

  const containmentText = r.containment.join(" ");
  for (const item of UNIQUE_ITEMS) {
    if (!item.pattern.test(containmentText)) continue;
    const claim = open.filter((c) =>
      item.pattern.test([c.assignment, c.action, c.dependencies, c.communication].join(" ")));
    if (claim.length >= item.quantity) {
      add("high", "Field inventory already committed",
        `The containment here needs the ${item.key}, and ${claim.length === 1 ? "it is" : `all ${item.quantity} are`} already committed to ${claim.map((c) => c.id).join(", ")}. Sequence them, or the containment does not happen.`);
    }
  }

  if (r.home) {
    const same = open.filter((c) => c.homeId === r.home!.id && (!attachTo || c.id !== attachTo));
    if (same.length) {
      add("med", "Other work open at this Home",
        `${r.home.id} already has ${same.map((c) => c.id).join(", ")} open. Batch the visits where the trades allow it rather than sending separate vendors to the same address.`);
    }
    if (r.home.moveIn) {
      add("high", "Home has a committed move-in",
        `${r.home.id} hands over ${r.home.moveIn}. Anything added here eats the QC buffer, which must close at least 4 hours before handover.`);
    }
    if (r.home.zone === "FL") {
      add("high", "No coverage in this zone",
        "Fort Lauderdale has one vendor, for paint and cleaning only. A licensed trade cannot be dispatched there at all.");
    }
  }

  if (r.priority.level === "P0") {
    for (const i of IMMOVABLE_COMMITMENTS) {
      add("med", "Immovable commitment today",
        `${i.who} is fixed at ${i.when} for ${i.caseId} (${i.zone}). ${i.why} Do not solve this P0 by pulling them off it.`);
    }
  }

  if (r.trade && !r.vendors.list.length && r.vendors.message) {
    add("high", "No qualified vendor available", r.vendors.message);
  }

  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

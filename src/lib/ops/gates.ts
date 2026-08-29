/**
 * THE TWO GATES THE INHERITED OPERATION DID NOT HAVE.
 *
 * 1. The access gate. Nothing checked whether a visit was executable before it
 *    was booked, so a vendor window was booked against a Resident who was not
 *    home, and a Field Specialist was sent to a building that had already
 *    refused entry. Every failed trip in the source data traces back to a
 *    condition here that nobody was required to confirm.
 *
 * 2. The verification owner. Vendor completion is not verification. Three
 *    committed move-ins had no named person responsible for confirming the
 *    work was actually done.
 *
 * These are conditions, not advice: the API refuses the transition and the UI
 * names the unmet condition. There is deliberately no force path, no admin
 * flag and no "dispatch anyway" — the whole point is that the route does not
 * exist. A condition is satisfied by a person recording what they checked.
 *
 * Closing a case is NOT gated on verification, and that is deliberate too:
 * closing a duplicate is a legitimate close with no work to verify, and
 * blocking it would push operators towards a bypass. The gates guard the two
 * transitions where a missing check costs a trip or a handover.
 */

import { OPEN_QUEUE } from "../domain/queue";
import { UNIQUE_ITEMS } from "../domain/inventory";
import { TRADES } from "../domain/policy";
import { homeById } from "../domain/homes";
import {
  LICENSED_TRADES,
  type CaseStatus,
  type GateKey,
  type Home,
  type OpsCase,
  type TradeKey,
} from "../domain/types";

export interface GateCondition {
  key: GateKey;
  label: string;
  /** Why this condition applies to THIS case, in the operator's words. */
  why: string;
  met: boolean;
  note?: string;
  at?: string;
}

/** The case's trade: recorded at intake, or read from the open queue. */
export function tradeOf(c: OpsCase): TradeKey | null {
  return c.trade ?? OPEN_QUEUE.find((q) => q.id === c.id)?.trade ?? null;
}

const tradeLabel = (t: TradeKey) => TRADES.find((x) => x.key === t)?.label ?? t;

/** Everything on the case a single-instance item could be named in. */
const caseText = (c: OpsCase) =>
  [c.assignment, c.action, c.dependencies, c.communication, c.fallback].join(" ");

/**
 * The conditions that apply to this case. A condition that does not apply is
 * not listed — a checklist padded with irrelevant items stops being read.
 */
export function dispatchConditions(c: OpsCase, home?: Home | null): GateCondition[] {
  const h = home === undefined ? homeById(c.homeId) ?? null : home;
  const trade = tradeOf(c);
  const out: GateCondition[] = [];

  const record = (key: GateKey, label: string, why: string) => {
    const r = c.gate?.[key];
    out.push({ key, label, why, met: !!r, note: r?.note, at: r?.at });
  };

  record(
    "accessConfirmed",
    "Access confirmed",
    h
      ? `Access on file: ${h.access}. ${h.keys}. Confirm the window positively — an assumed window is how a vendor arrives at an empty Home.`
      : "No Home is identified on this case, so no access rule can be checked at all. Identify the Home first.",
  );

  if (h?.coiHours) {
    record(
      "coiReceipted",
      "COI filed and receipt confirmed",
      `This building requires a Certificate of Insurance ${h.coiHours} hours before arrival. Submitting it is not the condition — confirming the building received it is. Entry is refused at the door otherwise.`,
    );
  }

  const buildingRule = h?.hoa || "";
  const noAuthorisation = h
    ? /concierge|NO ACCESS AUTHORISATION/i.test(`${h.access} ${h.notes}`)
    : false;
  if (buildingRule || noAuthorisation) {
    record(
      "buildingRuleMet",
      noAuthorisation ? "Written building authorisation held" : "Building rule met",
      noAuthorisation
        ? `Access here is controlled by the building, and no authorisation exists yet. Written confirmation must come FROM THE BUILDING — the Homeowner saying they sent it is not access, because the concierge works from the list.${buildingRule ? ` Requirement: ${buildingRule}.` : ""}`
        : `${buildingRule}. A building requirement lives on the Home, not on the case, which is why it goes unnoticed until a vendor is turned away.`,
    );
  }

  if (trade && LICENSED_TRADES.includes(trade)) {
    record(
      "licenceVerified",
      "Licence and insurance verified",
      `${tradeLabel(trade)} requires a licensed and insured vendor. Verify this vendor's licence covers it. A Field Specialist or generalist may never be assigned to this work, and there is no override.`,
    );
  }

  const needed = UNIQUE_ITEMS.filter((i) => i.pattern.test(caseText(c)));
  if (needed.length) {
    record(
      "partsOnHand",
      "Parts and equipment on hand",
      `This case relies on ${needed.map((i) => i.key).join(", ")}. ${
        needed.length === 1 ? "It exists once" : "Each exists once"
      } (${needed.map((i) => i.location).join("; ")}), so confirm it is actually free rather than committed to another case.`,
    );
  }

  return out;
}

export function dispatchGate(c: OpsCase, home?: Home | null) {
  const conditions = dispatchConditions(c, home);
  const unmet = conditions.filter((x) => !x.met);
  return { ok: unmet.length === 0, conditions, unmet };
}

export function verifyGate(c: OpsCase) {
  const v = c.verification;
  if (!v?.owner) {
    return {
      ok: false,
      reason:
        "No verification owner. A named Belong person must confirm this work functionally — a vendor reporting completion is not verification.",
    };
  }
  if (!v.check?.trim()) {
    return {
      ok: false,
      reason: `${v.owner} is named but recorded no functional check. Say what was tested, not that it was finished.`,
    };
  }
  return { ok: true as const, reason: undefined };
}

/**
 * The single answer both the API and the UI use, so what an operator is told
 * and what the server enforces can never drift apart.
 * Returns null when the transition is allowed.
 */
export function blockedReason(
  c: OpsCase,
  target: CaseStatus,
  home?: Home | null,
): string | null {
  if (target === "Dispatched") {
    const { ok, unmet } = dispatchGate(c, home);
    if (ok) return null;
    const first = unmet[0];
    const rest = unmet.length - 1;
    return `${first.label} is not satisfied${
      rest > 0 ? `, along with ${rest} other condition${rest > 1 ? "s" : ""}` : ""
    }. ${first.why}`;
  }
  if (target === "Verified") {
    const { ok, reason } = verifyGate(c);
    return ok ? null : (reason ?? null);
  }
  return null;
}

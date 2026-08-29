/**
 * Board view model.
 *
 * The board renders on the client (filters, inline edits) but the domain model
 * holds RegExps, which cannot cross that boundary. This module flattens a case
 * into plain, serialisable data and attaches the two things a card needs and
 * `OpsCase` does not carry: the issue wording from the open queue, and the Home.
 *
 * It derives, it does not decide. No priority, licence or spend rule lives here.
 */

import { OPEN_QUEUE } from "../domain/queue";
import { SLA } from "../domain/policy";
import { homeById } from "../domain/homes";
import { ZONE, type Home, type OpsCase, type Priority } from "../domain/types";
import { blockedReason, dispatchConditions, type GateCondition } from "./gates";

export interface CaseView extends OpsCase {
  /** The issue wording from the open queue — the card's title. */
  title: string;
  home: Home | null;
  zoneName: string;
  /** Present only where the priority is an actual P0/P1/P2 SLA grade. */
  sla: { level: Priority; clause: string } | null;
  /** The dispatch conditions that apply to this case, met and unmet. */
  conditions: GateCondition[];
  /** Non-null when the transition is refused, carrying the reason to show. */
  blockedDispatch: string | null;
  blockedVerify: string | null;
}

/**
 * Only an explicit P0/P1/P2 grade carries an SLA clause. The turnover and
 * onboarding cases are ranked CRITICAL / HIGH / MEDIUM / LOW by the 72-hour
 * plan, which is a sequencing decision rather than a service-level one —
 * attaching "immediate danger" to a paint crew would be inventing policy.
 * Those cases show their rationale instead, and the UI says which it is.
 */
export function slaFor(priority: string): { level: Priority; clause: string } | null {
  const m = /^P([012])\b/.exec(priority.trim());
  if (!m) return null;
  const level = `P${m[1]}` as Priority;
  return { level, clause: SLA[level].policy };
}

export function titleFor(caseId: string): string {
  return OPEN_QUEUE.find((q) => q.id === caseId)?.issue ?? "Opened from intake";
}

export function toView(c: OpsCase): CaseView {
  const home = homeById(c.homeId) ?? null;
  return {
    ...c,
    title: titleFor(c.id),
    home,
    zoneName: home ? ZONE[home.zone] : c.zone,
    sla: slaFor(c.priority),
    conditions: dispatchConditions(c, home),
    blockedDispatch: blockedReason(c, "Dispatched", home),
    blockedVerify: blockedReason(c, "Verified", home),
  };
}

export const OPEN_STATUSES = ["New", "Dispatched", "In progress", "Blocked"] as const;

export const isOpen = (c: { status: string }) =>
  (OPEN_STATUSES as readonly string[]).includes(c.status);

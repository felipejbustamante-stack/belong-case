/**
 * Turning a triaged message into a case on the board.
 *
 * This is a mapping, not a decision: every field below is copied from a
 * `TriageResult` the engine already produced. Nothing here re-grades a
 * priority, re-checks a licence or picks a vendor.
 *
 * New cases open UNASSIGNED on purpose. A case with no named owner is visible
 * as a blocking finding on the board within seconds of being created, which is
 * the correct outcome: nothing moves without an owner, and the board should
 * say so rather than quietly guessing one.
 */

import { ZONE, type Channel, type OpsCase, type RiskLevel, type TriageResult } from "../domain/types";

const risk = (level: string): RiskLevel =>
  level === "P0" ? "RED" : level === "P1" ? "AMBER" : "GREEN";

function assignmentText(r: TriageResult): string {
  const first = r.vendors.list[0];
  if (!first) {
    return (
      r.vendors.message ||
      "No vendor assigned yet — confirm the trade before booking anyone."
    );
  }
  const backup = r.vendors.list[1];
  return (
    `${r.resource}. Recommended: ${first.name} (${Math.round(first.firstVisitResolution * 100)}% first-visit resolution, ` +
    `${Math.round(first.onTime * 100)}% on time, ${first.capacity}). ` +
    (backup
      ? `Backup: ${backup.name}.`
      : "No backup vendor covers this trade in this zone — single-source risk.") +
    " Not yet booked: a dispatch to an occupied Home is a human decision."
  );
}

function dependencyText(r: TriageResult): string {
  const parts: string[] = [];
  if (r.home?.coiHours) {
    parts.push(
      `COI must be submitted ${r.home.coiHours} hours before arrival and receipt CONFIRMED, not assumed.`,
    );
  }
  const gaps = r.missingFacts.filter((m) => !m.startsWith("No material facts"));
  if (gaps.length) parts.push(`Unknown at intake: ${gaps.join(" ")}`);
  if (r.quarantined.length) {
    parts.push(
      `${r.quarantined.length} embedded instruction(s) were quarantined from the source message and are not operating facts.`,
    );
  }
  return parts.length ? parts.join(" ") : "None blocking at intake.";
}

function fallbackText(r: TriageResult): string {
  const backup = r.vendors.list[1];
  if (backup) {
    return `${backup.name} (${Math.round(backup.firstVisitResolution * 100)}% first-visit resolution) covers this trade in the same zone.`;
  }
  if (r.vendors.list.length === 1) {
    return `No compliant alternative to ${r.vendors.list[0].name} in this zone. If they fail, escalate — a generalist is not a fallback on licensed work.`;
  }
  return "No fallback identified. Escalate for out-of-network procurement rather than assigning an unqualified resource.";
}

export function caseFromTriage(
  r: TriageResult,
  id: string,
  body: string,
  channel: Channel,
): OpsCase {
  const now = new Date().toISOString();

  return {
    id,
    workstream: r.workstream,
    homeId: r.home?.id ?? "Unidentified",
    zone: r.home ? ZONE[r.home.zone] : "Not identified",
    priority: `${r.priority.level} — ${r.priority.rule.label}`,
    risk: risk(r.priority.level),
    owner: "Unassigned",
    status: "New",
    action: r.nextActions[0] ?? "Acknowledge and confirm access.",
    assignment: assignmentText(r),
    accessPlan: r.accessPlan.map((a) => `${a.key}: ${a.value}`).join(" · "),
    dependencies: dependencyText(r),
    cost:
      r.cost != null
        ? `$${r.cost.toLocaleString()} stated in the message${
            r.home ? ` (Home limit $${r.home.approvalLimit.toLocaleString()})` : ""
          }. ${r.approval.at(-1)?.value ?? ""}`
        : `Not estimated — diagnose before quoting.${
            r.home ? ` Home limit $${r.home.approvalLimit.toLocaleString()}.` : ""
          }`,
    communication: `Acknowledge within ${r.communication.ackWithin}; update ${r.communication.updateEvery}. A reply is drafted and awaits a person — nothing is sent automatically, and it commits to a time, never to money.`,
    fallback: fallbackText(r),
    rationale: `Opened from intake (${channel}). ${r.priority.rule.id} — ${r.priority.rule.label}. ${r.priority.policy} Home ${r.homeSource}.`,
    updates: [{ at: now, text: body, channel }],
    createdAt: now,
  };
}

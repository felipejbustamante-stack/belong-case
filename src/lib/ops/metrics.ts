/**
 * The measures that actually run the operation.
 *
 * The rule this file is built on: a measure is either computed from something
 * the system genuinely records, or it says which event is missing. It never
 * produces a number that looks right and measures nothing — that is how an
 * operation ends up confident and wrong.
 *
 * Where an outcome cannot be measured yet, the leading indicator that CAN be
 * measured is shown beside it and labelled as such. "Vendors we booked average
 * 91% first-visit resolution" is a real fact about a decision; it is not the
 * same claim as "91% of our visits resolved on the first attempt", and the two
 * are kept apart on purpose.
 */

import { VENDORS } from "../domain/vendors";
import { homeById } from "../domain/homes";
import { vendorsIn, openCases } from "../triage/conflicts";
import { dispatchGate } from "./gates";
import type { OpsCase } from "../domain/types";

export interface Metric {
  id: string;
  name: string;
  /** Why this measure is worth running the operation on. */
  why: string;
  /** null when the event it needs is not recorded yet. */
  value: string | null;
  /** How it was computed, or precisely which event is missing. */
  detail: string;
  /** What IS knowable today, where the outcome is not. */
  leading?: { label: string; value: string; note?: string };
  caseIds?: string[];
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** The first money figure stated in a free-text cost field. */
function statedCost(text: string): number | null {
  const m = /\$\s?([\d,]+)/.exec(text ?? "");
  if (!m) return null;
  const n = parseInt(m[1].replace(/,/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

export function metrics(cases: OpsCase[]): Metric[] {
  const open = openCases(cases);

  /* --- vendor quality actually committed to, weighted by case load --- */
  const bookings = open.flatMap((c) => vendorsIn(c.assignment));
  const committedFvr = bookings.length
    ? bookings.reduce((s, v) => s + v.firstVisitResolution, 0) / bookings.length
    : null;
  const networkFvr =
    VENDORS.reduce((s, v) => s + v.firstVisitResolution, 0) / VENDORS.length;
  const cheapest = [...VENDORS].sort((a, b) => a.tripFee - b.tripFee).slice(0, 4);
  const cheapestFvr =
    cheapest.reduce((s, v) => s + v.firstVisitResolution, 0) / cheapest.length;

  /* --- committed move-ins in the window --- */
  const moveIns = open.filter((c) => homeById(c.homeId)?.moveIn);
  const moveInsRed = moveIns.filter((c) => c.risk === "RED");

  /* --- the access gate, doing its work before a trip is wasted --- */
  const blocked = open.filter((c) => !dispatchGate(c).ok);

  /* --- verification --- */
  const verified = cases.filter((c) => c.verification);

  /* --- spend against the Home approval limit --- */
  const overLimit = open.filter((c) => {
    const cost = statedCost(c.cost);
    const limit = homeById(c.homeId)?.approvalLimit;
    return cost != null && limit != null && cost > limit;
  });

  const resolved = cases.filter((c) => c.status === "Verified" || c.status === "Closed");

  return [
    {
      id: "arrival",
      name: "P0 and P1 qualified arrival within target",
      why: "The promise a Resident actually experiences. A priority that never turns into someone at the door is a label, not a response.",
      value: null,
      detail:
        "Not yet recorded. It needs two timestamps this system does not capture: when a vendor was dispatched, and when a qualified person was on site. Adding them is a change to the case record, not a change to this page — and until they exist, a number here would be invented.",
      leading: {
        label: "Open P0 and P1 cases carrying an arrival target",
        value: String(open.filter((c) => /^P[01]\b/.test(c.priority)).length),
        note: "The denominator is real; only the outcome is missing.",
      },
      caseIds: open.filter((c) => /^P[01]\b/.test(c.priority)).map((c) => c.id),
    },
    {
      id: "fvr",
      name: "First-visit resolution",
      why: "The best available predictor of true cost. A second visit costs a trip fee, a Resident's morning, and the credibility of the first promise.",
      value: committedFvr != null ? pct(committedFvr) : null,
      detail:
        committedFvr != null
          ? `This is the first-visit resolution of the vendors actually booked across the open board, weighted by how many cases each carries, against a network average of ${pct(networkFvr)}. It measures the quality of the booking decisions taken — not an outcome. The outcome version needs a resolved-or-not record per visit.`
          : "No vendors are named on the open board yet.",
      leading: {
        label: "The four cheapest vendors in the network average",
        value: pct(cheapestFvr),
        note: "Which is why vendors here are ranked on first-visit resolution and never on price.",
      },
    },
    {
      id: "repeat",
      name: "Repeat repair within 60 days",
      why: "A repeat is the loudest signal that the first fix treated a symptom. It is also the cheapest failure to catch, because the history is already in the system.",
      value: null,
      detail:
        "Not yet recorded. It needs a resolved-at date on each case and a link from a new case to prior work at the same Home. The board carries the narrative of one repeat today, but a narrative is not a measure and should not be counted as one.",
    },
    {
      id: "movein",
      name: "Committed move-ins met without a QC exception",
      why: "The commitment with a person and a moving van behind it. Missing one is not a slipped ticket; it is somebody with nowhere to sleep.",
      value: null,
      detail:
        "Not yet recorded. It needs the handover itself — the QC completion time against the move-in time, and whether an exception was raised. What is knowable before the handover is shown beside it.",
      leading: {
        label: "Committed move-ins in the window still carrying red work",
        value: `${moveInsRed.length} of ${moveIns.length}`,
        note: "Final QC must close at least 4 hours before handover, with no unresolved life-safety, security, utility, sanitation or required-appliance blocker.",
      },
      caseIds: moveInsRed.map((c) => c.id),
    },
    {
      id: "access",
      name: "Failed-access visits as a share of dispatches",
      why: "Every failed trip is a vendor paid, a Resident let down and a day lost. In the inherited queue nothing checked whether a visit was executable before it was booked.",
      value: null,
      detail:
        "Not yet recorded as an outcome — it needs a dispatch result per visit. The access gate now prevents the condition upstream, so the number worth watching in the meantime is how much it is catching.",
      leading: {
        label: "Open cases the access gate is currently holding",
        value: `${blocked.length} of ${open.length}`,
        note: "Each one would have been a bookable visit under the inherited process.",
      },
      caseIds: blocked.map((c) => c.id),
    },
    {
      id: "containment",
      name: "Median time to containment, P0 and P1",
      why: "Containment is what stops the harm. It is a different clock from the repair, and collapsing the two is how an operation congratulates itself for a portable AC.",
      value: null,
      detail:
        "Not yet recorded. It needs a containment-started timestamp, distinct from dispatch and from completion. The engine already separates the containment action from the repair on every case, so the field has somewhere to live.",
    },
    {
      id: "cost",
      name: "Cost per resolved case, and share of spend above the Home limit",
      why: "Spend above the Home limit is where authority is either respected or quietly bypassed. Cost per resolved case is the only cost figure that accounts for the second visit.",
      value: resolved.length
        ? `${resolved.length} resolved`
        : null,
      detail: resolved.length
        ? "Cost per resolved case still needs a settled invoice per case; the count of resolved cases is real."
        : "Not yet recorded. Nothing on the board has been resolved yet, and cost per resolved case needs a settled invoice rather than an estimate.",
      leading: {
        label: "Open cases whose stated cost exceeds the Home approval limit",
        value: `${overLimit.length} of ${open.length}`,
        note: "Read from the first figure in each case's cost field, which is free text today. That it has to be parsed at all is the finding: cost belongs in a structured field, and until it is, this number undercounts a case whose larger figure is written later in the sentence.",
      },
      caseIds: overLimit.map((c) => c.id),
    },
    {
      id: "verification",
      name: "Cases verified by a named person",
      why: "Vendor completion is never verification. This is the measure that stops a case closing because somebody said it was done.",
      value: `${verified.length} of ${cases.length}`,
      detail:
        "Computed from the verification record on each case: a named Belong person and the functional check they performed. A vendor reporting completion cannot populate it.",
      caseIds: verified.map((c) => c.id),
    },
  ];
}

/**
 * Measures deliberately absent. Both improve by doing the wrong thing — you
 * close cases faster by closing them early, and you reply faster by replying
 * with nothing.
 */
export const NOT_MEASURED = [
  {
    name: "Cases closed per day",
    why: "Improves when cases are closed before the work is verified. The board already refuses to call vendor completion verification; measuring closures would argue with that every day.",
  },
  {
    name: "Time to first reply",
    why: "Improves when the reply says nothing. What matters is an acknowledgement that carries a named person and a time, which the SLA clause already governs.",
  },
];

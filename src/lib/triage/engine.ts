/**
 * BELONG FIELD TRIAGE ENGINE
 *
 * Deterministic by design. There is no language model in this path, and that is
 * a decision rather than a limitation: the source data contained five
 * instructions written to be obeyed by an automated reader, three of which
 * pointed at the three most expensive errors available in the queue. A model
 * reading vendor-supplied free text is exactly the surface those instructions
 * attack. This engine quarantines them before it analyses anything, and it
 * cannot be talked out of a licensing rule.
 *
 * Every output traces to a rule id and a source sheet.
 */

import { HOMES, homeById } from "../domain/homes";
import { VENDORS, capacityOf } from "../domain/vendors";
import { UNIQUE_ITEMS, INVENTORY } from "../domain/inventory";
import { OPEN_QUEUE } from "../domain/queue";
import {
  SLA, TRADES, WATER_CONTAINED, ELECTRICAL_CONTAINED, NEGATED_HAZARD,
  P0_RULES, P1_RULES, VULNERABLE_OCCUPANTS, INJECTION_SIGNATURE,
  CONTAINMENT_AUTHORITY, MOVE_IN_EXCEPTION_CEILING,
} from "../domain/policy";
import {
  ZONE, LICENSED_TRADES,
  type Home, type Vendor, type ZoneCode, type TradeKey, type TriageResult,
  type TradeMatch, type CaseMatch, type MatchCandidate, type MatchConfidence,
  type MessageType, type Flag, type KeyValue, type Workstream,
  type VendorRecommendation, type PriorityRule, type Priority,
} from "../domain/types";

/* ------------------------------------------------------------------ utils */

const anyMatch = (t: string, rx: RegExp[]) => rx.some((r) => r.test(t));
const allMatches = (t: string, rx: RegExp[]) =>
  rx.filter((r) => r.test(t)).map((r) => (t.match(r) ?? [""])[0].trim()).filter(Boolean);
const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ------------------------------------------------------- injection defence */

/**
 * Text aimed at an automated reader, pulled out BEFORE anything is analysed so
 * it cannot influence a priority, a trade, a vendor or a draft.
 */
export function findInjections(text: string): string[] {
  const found: string[] = [];
  for (const b of text.match(/\[[^\]]{15,600}\]/g) ?? []) {
    if (INJECTION_SIGNATURE.test(b)) found.push(b);
  }
  for (const q of text.match(/"[^"]{25,600}"/g) ?? []) {
    if (/\b(assistant|ai|system)\b/i.test(q) && INJECTION_SIGNATURE.test(q) && !found.includes(q)) {
      found.push(q);
    }
  }
  return found;
}

/* --------------------------------------------------------- classification */

/** A vendor progress note is not a service request, and neither is a building refusal. */
export function detectMessageType(t: string): MessageType {
  if (/building says|concierge|not authoriz|will deny|deny (everyone|entry|access)|approved (access )?list|access list|denied entry/.test(t)) {
    return {
      key: "access",
      label: "Access / building notice",
      note: "This is a building or access notice, not a service request. Nothing may be dispatched against it until written authorisation exists.",
    };
  }
  if (
    /\bwe are\b|\bwe will\b|\bwe can\b|\bwe need\b|our crew|crew (can|finished|completed|is|will|needs)|walkthrough|second coat|punch ?list|% ?done|\beta\b|delivery says|hold (it )?until|can start|our team|will confirm/.test(t) &&
    !/\bi (am|can|will|have|leave|stay)\b|my \w+ is/.test(t)
  ) {
    return {
      key: "vendor",
      label: "Vendor / delivery update",
      note: "A vendor or delivery update against existing work. The value is in the timings and dependencies it changes, not in a new priority.",
    };
  }
  return { key: "request", label: "Resident service request", note: "" };
}

export function extractTimings(raw: string): string[] {
  const out: string[] = [];
  const rx = /[^.;\n]*?\b(\d{1,2}(:\d{2})?\s?(am|pm)?\s?(-|–|to|until)\s?\d{1,2}(:\d{2})?\s?(am|pm)?|by \d{1,2}(:\d{2})?\s?(am|pm)?|\d{1,2}:\d{2})\b[^.;\n]*/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(raw)) !== null) {
    const s = m[0].trim();
    if (s.length > 3 && !out.includes(s)) out.push(s);
  }
  return out;
}

export function detectTrade(t: string): TradeMatch | null {
  const scored = TRADES
    .map((tr) => ({ trade: tr, evidence: allMatches(t, tr.keywords) }))
    .filter((x) => x.evidence.length)
    .sort((a, b) => b.evidence.length - a.evidence.length);
  if (!scored.length) return null;

  // A ceiling stain after rain is roofing, even though "leak" reads as plumbing.
  if (scored.length > 1 && /ceiling|roof|after (the )?rain/.test(t)) {
    const roof = scored.find((s) => s.trade.key === "roofing");
    if (roof) {
      return {
        trade: roof.trade,
        evidence: roof.evidence,
        alternatives: scored.filter((s) => s !== roof).slice(0, 2)
          .map((s) => ({ trade: s.trade, evidence: s.evidence, alternatives: [] })),
      };
    }
  }
  return {
    trade: scored[0].trade,
    evidence: scored[0].evidence,
    alternatives: scored.slice(1, 3)
      .map((s) => ({ trade: s.trade, evidence: s.evidence, alternatives: [] })),
  };
}

export function detectPriority(t: string) {
  const contained = anyMatch(t, WATER_CONTAINED) || anyMatch(t, ELECTRICAL_CONTAINED);

  const fire = (rules: PriorityRule[], level: Priority) => {
    for (const r of rules) {
      if (r.blockedBy === "water" && anyMatch(t, WATER_CONTAINED)) continue;
      const allOk = !r.all || r.all.every((x) => x.test(t));
      if (allOk && anyMatch(t, r.any)) {
        return {
          level,
          rule: { id: r.id, label: r.label },
          contained,
          policy: SLA[level].policy,
          ackMinutes: SLA[level].ackMinutes,
          arriveHours: SLA[level].arriveHours as number | null,
        };
      }
    }
    return null;
  };

  return (
    fire(P0_RULES, "P0") ??
    fire(P1_RULES, "P1") ?? {
      level: "P2" as Priority,
      rule: { id: "P2", label: "Issue is contained and safe to schedule" },
      contained,
      policy: SLA.P2.policy,
      ackMinutes: SLA.P2.ackMinutes,
      arriveHours: null,
    }
  );
}

/* ------------------------------------------------------------- case match */

function detectHomeDirect(text: string): Home | null {
  const m = /H-\d{4}/i.exec(text);
  if (m) return homeById(m[0].toUpperCase()) ?? null;
  const u = /unit\s+(\d{3,4})/i.exec(text);
  if (u && u[1] === "1804") return homeById("H-3002") ?? null;
  return null;
}

/**
 * Match free text against the open queue, returning ranked candidates WITH the
 * evidence for each so a person can see why and override it.
 *
 * A quoted Home ID identifies the HOME, never the CASE. A Home we manage can
 * have a brand-new, unrelated problem — conflating the two once attached a
 * garage-door fault to an air-conditioning case as a "confirmed" match.
 */
export function matchCase(raw: string, trade: TradeMatch | null): CaseMatch {
  const t = raw.toLowerCase();
  const caseId = /\b([MRO]-\d{3})\b/i.exec(raw);
  const homeId = /\bH-\d{4}\b/i.exec(raw);
  const unit = /unit\s+(\d{3,4})/.exec(t);
  const zoneHit = (Object.keys(ZONE) as ZoneCode[])
    .find((k) => t.includes(ZONE[k].toLowerCase())) ?? null;

  const scored: MatchCandidate[] = OPEN_QUEUE.map((c) => {
    const home = homeById(c.homeId) ?? null;
    let score = 0;
    const evidence: string[] = [];
    const idQuoted = !!(caseId && caseId[1].toUpperCase() === c.id);

    if (idQuoted) { score += 100; evidence.push("Case ID quoted in the message"); }
    if (homeId && homeId[0].toUpperCase() === c.homeId) { score += 22; evidence.push("Same Home as this open case"); }
    if (unit && unit[1] === "1804" && c.homeId === "H-3002") { score += 22; evidence.push("Same Home as this open case (unit 1804)"); }
    if (trade && trade.trade.key === c.trade) { score += 18; evidence.push(`Trade matches (${trade.trade.label})`); }

    const kw = allMatches(t, c.keywords);
    if (kw.length) {
      score += Math.min(kw.length * 14, 60);
      evidence.push(`Distinctive wording: ${kw.join(", ")}`);
    }

    if (zoneHit && home) {
      if (home.zone === zoneHit) { score += 15; evidence.push(`Zone named (${ZONE[zoneHit]})`); }
      else { score -= 40; evidence.push(`Zone named is ${ZONE[zoneHit]}, but this case is in ${ZONE[home.zone]}`); }
    }

    if (home) {
      const window = home.access.toLowerCase();
      for (const w of t.match(/\b\d{1,2}(:\d{2})?\s?(am|pm)?\s?(-|–|to|until)\s?\d{1,2}(:\d{2})?\b/g) ?? []) {
        const nums = w.match(/\d{1,2}/g) ?? [];
        if (nums.length >= 2 && nums.every((n) => window.includes(n) || window.includes(String(Number(n) + 12)))) {
          score += 20;
          evidence.push(`Access window "${w.trim()}" matches this Home's recorded availability`);
          break;
        }
      }
    }

    // Only the issue itself anchors a match. A shared Home or trade is context.
    const anchored = kw.length > 0 || idQuoted;
    return { queueCase: c, home, score, evidence, keywordHits: kw.length, idQuoted, anchored };
  })
    .filter((x) => x.score > 0 && x.anchored)
    .sort((a, b) => b.score - a.score);

  const top = scored[0] ?? null;
  const confidence: MatchConfidence = !top
    ? "none"
    : top.idQuoted ? "confirmed"
    : top.keywordHits >= 3 ? "strong"
    : top.keywordHits === 2 && top.score >= 45 ? "strong"
    : top.keywordHits >= 1 ? "possible"
    : "none";

  const duplicates = top
    ? scored.filter((x) => x.queueCase.homeId === top.queueCase.homeId && x.queueCase.id !== top.queueCase.id && x.score >= 25)
    : [];
  const zoneHomes = !homeId && !unit && zoneHit ? HOMES.filter((h) => h.zone === zoneHit) : [];

  return { top, confidence, alternatives: scored.slice(1, 4), duplicates, zoneHit, zoneHomes };
}

/* ------------------------------------------------------------- containment */

export function containmentFor(
  trade: TradeMatch | null, ruleId: string, home: Home | null, t: string,
): string[] {
  const out: string[] = [];
  const k = trade?.trade.key ?? null;

  if (ruleId === "P0.1") {
    out.push("ENERGIZED WATER CONTACT. Isolate power to the affected area first, keep everyone clear of it, and only then trace the water source. Two trades are involved: a licensed electrician to clear the circuit and a licensed plumber to stop the water.");
  }
  if (k === "plumbing") {
    out.push(
      anyMatch(t, [/valve/, /turned .{0,15}off/])
        ? "Resident has already closed the supply valve — confirm it stays closed and the fixture is not used until a licensed plumber attends."
        : anyMatch(t, [/stopped using/, /not using it/, /wiped (it )?up/])
        ? "Resident has already taken the fixture out of service — adequate containment. Confirm it stays unused; nothing further is needed before the scheduled visit."
        : "Instruct the Resident to close the local supply valve and stop using the fixture.",
    );
    if (/soaked|water ran|wet|saturated/.test(t)) {
      out.push(`Wet/dry vacuum (${INVENTORY.plumbing.location}) for contained surface water only. If a moisture reading is material, escalate to DryNow Restoration — IICRC-certified, $650 minimum, inside the lead's $${CONTAINMENT_AUTHORITY.toLocaleString()} containment authority.`);
    }
  }
  if (k === "electrical") {
    out.push("Confirm the affected breaker is OFF and nothing is re-energised until a licensed electrician has tested the circuit.");
  }
  if (k === "hvac") {
    const i = INVENTORY.hvac;
    out.push(`${i.item} (${i.quantity} available, ${i.location}). ${i.note}.` +
      (home && /sliding|portable ac/i.test(home.notes) ? " This Home is confirmed suitable." : " Confirm a suitable window before dispatch."));
  }
  if (k === "appliance" && /fridge|refrigerator|freezer/.test(t)) {
    const i = INVENTORY.appliance;
    out.push(`${i.item} (${i.quantity} available, ${i.location}). ${i.note}.`);
    out.push("Advise the Resident that food held above 4°C for more than 2 hours should be discarded; ask them to photograph anything discarded and keep receipts.");
  }
  if (k === "locksmith") {
    out.push("If a permanent fix cannot be completed inside the access window, install a temporary secure lock or hasp. The Home is not left unsecured under any circumstances.");
  }
  if (k === "roofing") {
    out.push("Take a moisture reading before assuming the stain is inactive. A Field Specialist can do this; it is triage, not a mitigation assessment.");
  }
  if (k === "pool") {
    out.push("The universal latch kit may improve the latch temporarily but does NOT replace qualified compliance verification. Where children are expected, restrict access to the pool area until a qualified contractor certifies self-close and latch.");
  }
  if (!out.length) out.push("No containment action required — the issue is contained and can be scheduled.");
  return out;
}

/* ----------------------------------------------------------- access & gaps */

export function accessPlan(home: Home | null): KeyValue[] {
  if (!home) {
    return [{ key: "BLOCKER", value: "Home not identified. Access, approval limit and building requirements cannot be verified — resolve before dispatch." }];
  }
  const out: KeyValue[] = [
    { key: "Window", value: home.access },
    { key: "Keys", value: home.keys },
  ];
  if (home.hoa) out.push({ key: "Building / HOA", value: home.hoa });
  if (home.coiHours) {
    out.push({ key: "COI", value: `Certificate of Insurance required ${home.coiHours} hours before arrival. Submit and CONFIRM receipt — do not assume.` });
  }
  if (/concierge/i.test(home.access)) {
    out.push({ key: "BLOCKER", value: "Concierge-controlled access. Written authorisation from the building is required before any dispatch — the Homeowner's word is not access." });
  }
  if (/OFF until/i.test(home.notes)) {
    out.push({ key: "BLOCKER", value: "Utilities are off. Any inspection depending on power or water will produce an incomplete report." });
  }
  if (/no lockbox/i.test(home.keys) && home.stage === "Occupied") {
    out.push({ key: "Constraint", value: "No lockbox on file — the Resident must be present for the whole visit." });
  }
  return out;
}

export function missingFacts(
  t: string, home: Home | null, trade: TradeMatch | null, level: Priority,
): string[] {
  const m: string[] = [];
  if (!home) m.push("Home ID not identified in the message.");
  if (!trade) m.push("Trade could not be determined from the description — a coordinator must clarify before assigning a vendor.");
  if (
    !/\b\d{1,2}(:\d{2})?\s*(am|pm)?\b.{0,12}(to|-|until|–)\s*\d/i.test(t) &&
    !/all day|flexible|vacant|anytime/i.test(t) && home?.stage === "Occupied"
  ) {
    m.push("No Resident access window stated in the message.");
  }
  if (/\$\s?[\d,]{3,}/.test(t) && !/diagnos|tested|onsite|inspection/i.test(t)) {
    m.push("A cost figure appears with no evidence of an onsite diagnosis — treat as an unsupported estimate, not an approval-ready quote.");
  }
  if (/neighbou?r|friend|someone else/i.test(t) && /might|maybe|could|not (yet )?asked|have not asked/i.test(t)) {
    m.push("Third-party access is mentioned but not authorised. Policy requires Resident-confirmed access or documented lockbox authorisation — this does not qualify.");
  }
  if (/warranty/i.test(t) || home?.underWarranty) {
    m.push("Confirm in writing whether independent service voids or limits the manufacturer's parts-and-labour coverage before dispatching a third party.");
  }
  if (level !== "P2" && home?.stage === "Occupied" && !/\b(am|pm|\d{1,2}:\d{2})\b/i.test(t)) {
    m.push("No time reference given — the SLA clock cannot be checked against actual availability.");
  }
  return m.length ? m : ["No material facts missing. The case can be dispatched once access is confirmed."];
}

/* ------------------------------------------------------------------- flags */

export function riskFlags(
  t: string, home: Home | null, trade: TradeMatch | null,
  level: Priority, ruleLabel: string, injections: string[],
): Flag[] {
  const f: Flag[] = [];
  const add = (severity: Flag["severity"], kind: string, text: string) => f.push({ severity, kind, text });

  if (level === "P0") add("high", "Safety", `P0 condition detected: ${ruleLabel}. Containment begins immediately; qualified arrival targeted within 2 hours.`);

  const licNeeded = trade && LICENSED_TRADES.includes(trade.trade.key);
  const licAlt = trade?.alternatives.filter((a) => LICENSED_TRADES.includes(a.trade.key)) ?? [];
  if (licNeeded) add("high", "Licensed trade", `${trade!.trade.label} work requires an appropriately licensed and insured vendor. Field Specialists and generalists may NOT diagnose or repair it.`);
  if (licAlt.length) add("high", "Licensed trade", `A second trade appears in this message: ${licAlt.map((a) => a.trade.label).join(", ")}. It also requires a licensed vendor and cannot be bundled into a generalist visit.`);
  if ((licNeeded || licAlt.length) && /handy ?man|generalist|general repair|your guy|handyhub|same person/.test(t)) {
    add("high", "Requested resource not permitted", "The message asks for a generalist on work that requires a licence. This request cannot be granted as stated — explain why and assign the correct trade.");
  }

  if (home && /concierge|NO ACCESS AUTHORISATION/i.test(home.access + home.notes)) {
    add("high", "Access", 'No access authorisation exists. Dispatching before written building confirmation produces a failed trip and a false "access confirmed" record.');
  }
  if (home?.coiHours) add("med", "Access", `COI must be submitted ${home.coiHours} hours before arrival or entry is denied at the door.`);
  if (home?.moveIn) add("high", "Move-in", `This Home has a committed move-in: ${home.moveIn}. Final QC must complete at least 4 hours beforehand, with no unresolved life-safety, security, utility, sanitation or required-appliance blocker.`);

  if (anyMatch(t, [/\bagain\b/, /same (issue|problem|thing|spot)/, /last time/, /already (put|reported|submitted|called)/, /second time/, /keeps? (happening|coming back)/])) {
    add("high", "Repeat / duplicate", "Language indicates a repeat or a duplicate report. A repeat within 60 days requires a root-cause review — do not re-run the same low-scope fix.");
  }
  if (anyMatch(t, VULNERABLE_OCCUPANTS)) {
    add("high", "Vulnerable occupants", "Vulnerable occupants are mentioned. This does not change the policy priority but it raises the urgency of containment and the frequency of updates.");
  }
  if (home?.underWarranty) add("med", "Warranty", "The equipment is under manufacturer warranty. Independent service may void coverage — verify before dispatching a third party.");
  if (/reimburs|pay(ing)? for|who pays|compensat|refund|cover the cost/i.test(t)) {
    add("med", "Commitment", "The Resident has raised money. Do NOT promise reimbursement or an outcome without authority — acknowledge, escalate, and give a specific time for an answer.");
  }
  if (home?.zone === "FL") {
    add("high", "Coverage", "Fort Lauderdale is served by one vendor (paint and cleaning only). There is no licensed-trade, locksmith, roofing, mitigation or photography coverage in this zone.");
  }
  if (injections.length) {
    add("high", "Data integrity", `${injections.length} embedded instruction(s) aimed at an automated reader were detected and quarantined before analysis. They influenced nothing above.`);
  }
  return f.length ? f : [{ severity: "low", kind: "Clear", text: "No safety, access, approval, SLA, duplicate or move-in risk detected." }];
}

/* ---------------------------------------------------------------- approval */

export function approvalRoute(home: Home | null, cost: number | null): KeyValue[] {
  const limit = home?.approvalLimit ?? null;
  const r: KeyValue[] = [
    { key: "Home approval limit", value: limit ? `$${limit.toLocaleString()}` : "Unknown — Home not identified" },
    { key: "Emergency containment", value: `Up to $${CONTAINMENT_AUTHORITY.toLocaleString()} may proceed without prior Homeowner approval (In-Home Services Lead).` },
  ];
  if (cost == null) {
    r.push({ key: "Route", value: "No cost estimated yet. Diagnose first, then route by amount." });
  } else if (limit && cost <= limit) {
    r.push({ key: "Route", value: `$${cost.toLocaleString()} is within the Home limit — a coordinator or lead may approve.` });
  } else if (limit && home?.signedLease && cost <= MOVE_IN_EXCEPTION_CEILING) {
    r.push({ key: "Route", value: `$${cost.toLocaleString()} exceeds the $${limit.toLocaleString()} Home limit. This Home has a signed move-in, so the MANAGER may approve up to $${MOVE_IN_EXCEPTION_CEILING.toLocaleString()} under the signed-move-in exception — requires a signed lease, outreach through at least two channels, credible cost and scope, and a clear threat to the committed move-in. Document the exception.` });
  } else if (cost > MOVE_IN_EXCEPTION_CEILING) {
    r.push({ key: "Route", value: `$${cost.toLocaleString()} exceeds $${MOVE_IN_EXCEPTION_CEILING.toLocaleString()} — EXECUTIVE approval required. Agree the escalation contact before committing a vendor.` });
  } else {
    r.push({ key: "Route", value: `$${cost.toLocaleString()} exceeds the Home limit — Homeowner approval required.${home ? " Response pattern: " + home.responsePattern + "." : ""}` });
  }
  return r;
}

/* ----------------------------------------------------------------- vendors */

export function recommendVendors(trade: TradeMatch | null, home: Home | null): VendorRecommendation {
  if (!trade) return { list: [], excluded: [], message: "Trade undetermined — no vendor can be recommended." };

  const zone = home?.zone ?? null;
  const needsLicence = LICENSED_TRADES.includes(trade.trade.key);
  const excluded: { name: string; why: string }[] = [];

  let pool = VENDORS.filter((v) => v.trade === trade.trade.key);
  if (zone) {
    VENDORS.filter((v) => v.trade === trade.trade.key && !v.zones.includes(zone))
      .forEach((v) => excluded.push({ name: v.name, why: `Does not cover ${ZONE[zone]}` }));
    pool = pool.filter((v) => v.zones.includes(zone));
  }
  if (needsLicence) {
    VENDORS.filter((v) => !v.licensed && v.trade === "general" && (!zone || v.zones.includes(zone)))
      .forEach((v) => excluded.push({ name: v.name, why: `Not licensed for ${trade.trade.label} — excluded by the licensed-trades policy` }));
  }
  pool.filter((v) => v.flagged).forEach((v) => excluded.push({ name: v.name, why: v.notes }));

  const list = pool.filter((v) => !v.flagged)
    .sort((a, b) => (b.firstVisitResolution - a.firstVisitResolution) || (b.onTime - a.onTime));

  const warning = !zone && list.length
    ? "The Home is not identified, so this list is NOT filtered by zone. Confirm the Home before booking — several vendors do not cover every zone."
    : undefined;

  return {
    list, excluded, warning,
    message: list.length ? "" :
      `No vendor in the network covers ${trade.trade.label}${zone ? " in " + ZONE[zone] : ""}. This is a coverage gap — escalate for out-of-network procurement rather than assigning an unqualified vendor.`,
  };
}

/* ---------------------------------------------------------- communication */

export function draftCommunication(t: string, home: Home | null, level: Priority, trade: TradeMatch | null, containment: string[]) {
  const updateEvery = level === "P0" ? "within the next 30 minutes" : level === "P1" ? "within the next hour" : "by the end of the day";
  const ackWithin = level === "P0" ? "10 minutes" : level === "P1" ? "30 minutes" : "4 business hours";

  let body = "Thank you for reporting this — I have it and I am on it.\n\n";
  if (containment.length && !/No containment action/.test(containment[0])) {
    body += "Right now: " + containment[0].replace(/^Resident has already/, "You have already") + "\n\n";
  }
  if (trade && LICENSED_TRADES.includes(trade.trade.key)) {
    body += `I am assigning a licensed ${trade.trade.label.toLowerCase()} contractor rather than a general handyman, because this is work that requires a licence.\n\n`;
  }
  body += home?.stage === "Occupied"
    ? `Access: ${home.access}. I will confirm the arrival window with you before the vendor is dispatched.\n\n`
    : "I will confirm the visit window once the vendor is booked.\n\n";
  body += `I will update you ${updateEvery}, and immediately if the arrival time changes.`;
  if (/reimburs|pay(ing)? for|who pays|compensat|refund/i.test(t)) {
    body += "\n\nOn your question about cost: I am raising it today and will come back to you with a clear answer before the end of the day. I do not want to promise you something I cannot stand behind, so please keep photographs and receipts of anything affected in the meantime.";
  }
  return { ackWithin, updateEvery, body };
}

export function nextActions(
  level: Priority, home: Home | null, vendors: VendorRecommendation, injections: string[],
): string[] {
  const out: string[] = [];
  const first = vendors.list[0]?.name ?? "a qualified vendor";
  if (injections.length) out.push("Discard the quarantined instructions — they are not operating facts.");
  if (!home) {
    out.push("Identify the Home before anything else; without it access, limits and building rules cannot be verified.");
  } else if (/concierge|NO ACCESS AUTHORISATION/i.test(home.access + home.notes)) {
    out.push("Do NOT dispatch. Obtain the building's exact authorisation requirements, then get written confirmation from the building — not from the Homeowner.");
  } else if (level === "P0") {
    out.push(`Acknowledge within 10 minutes, confirm containment is holding, and book ${first} for the earliest slot that fits the access window.`);
  } else if (level === "P1") {
    out.push(`Acknowledge within 30 minutes, put containment in place today, and book ${first} inside the Resident's stated window.`);
  } else {
    out.push(`Contact the Resident within 4 business hours and schedule ${first} inside their stated access window.`);
  }
  if (home?.coiHours) out.push(`Submit the COI at least ${home.coiHours} hours before arrival and confirm the building has received it.`);
  return out;
}

/* -------------------------------------------------------------------- main */

export function triage(raw: string, forcedHomeId?: string | null): TriageResult {
  const quarantined = findInjections(raw);
  let text = raw;
  for (const i of quarantined) text = text.replace(i, " ");

  const lower = text.toLowerCase();
  const scan = lower.replace(NEGATED_HAZARD, " ");

  const messageType = detectMessageType(lower);
  const trade = detectTrade(scan);
  const match = matchCase(text, trade);

  const explicit = forcedHomeId ? homeById(forcedHomeId) ?? null : detectHomeDirect(text);
  const home = explicit ??
    (match.top && ["confirmed", "strong"].includes(match.confidence) ? match.top.home : null);
  const homeSource = forcedHomeId ? "set manually by the operator"
    : explicit ? "identified directly in the message"
    : home ? `inferred from the matched case (${match.confidence} match)`
    : "not identified";

  const priority = detectPriority(scan);
  const containment = containmentFor(trade, priority.rule.id, home, scan);

  const vendors: VendorRecommendation =
    messageType.key === "access"
      ? { list: [], excluded: [], message: "No vendor is recommended. Nothing may be dispatched to this Home until the building confirms authorisation in writing." }
      : messageType.key === "vendor"
      ? { list: [], excluded: [], message: "No new vendor is required. This update changes the timing of work already booked — act on the dependencies rather than opening a dispatch." }
      : recommendVendors(trade, home);

  const costMatch = /\$\s?([\d,]+)/.exec(text);
  const cost = costMatch ? parseInt(costMatch[1].replace(/,/g, ""), 10) : null;

  const workstream: Workstream = home
    ? home.stage === "Turnover" ? "Turnover / Home Readiness"
    : home.stage === "Onboarding" ? "Onboarding" : "In-Home Services"
    : trade && ["turnover", "haul", "cleaning", "photo"].includes(trade.trade.key)
    ? "Turnover / Home Readiness" : "In-Home Services";

  const resource = !trade ? "Undetermined"
    : LICENSED_TRADES.includes(trade.trade.key) || ["appliance", "locksmith"].includes(trade.trade.key)
    ? `Licensed vendor — ${trade.trade.label}`
    : trade.trade.key === "general" ? "Field Specialist or general vendor"
    : `Vendor crew — ${trade.trade.label}`;

  return {
    quarantined, home, homeSource, match, trade, priority, containment, vendors, cost,
    workstream, resource, messageType,
    timings: extractTimings(text),
    accessPlan: accessPlan(home),
    missingFacts: missingFacts(scan, home, trade, priority.level),
    flags: riskFlags(scan, home, trade, priority.level, priority.rule.label, quarantined),
    approval: approvalRoute(home, cost),
    communication: draftCommunication(scan, home, priority.level, trade, containment),
    nextActions: nextActions(priority.level, home, vendors, quarantined),
    cleanedText: text.trim(),
  };
}

export { capacityOf, UNIQUE_ITEMS };

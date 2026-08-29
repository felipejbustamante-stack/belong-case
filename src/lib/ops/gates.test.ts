/**
 * Tests for the two gates.
 *
 * These are not edge cases: each one is a failure that actually happened in the
 * source data. Run with `npm test`.
 */

import { SEED_CASES } from "../domain/cases";
import { dispatchConditions, dispatchGate, verifyGate, blockedReason } from "./gates";
import type { OpsCase } from "../domain/types";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(
    `${ok ? "  ok  " : "  FAIL"}  ${name}${ok ? "" : `\n         expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`,
  );
}

const seed = (id: string): OpsCase => {
  const c = SEED_CASES.find((x) => x.id === id);
  if (!c) throw new Error(`no seed case ${id}`);
  return structuredClone(c);
};

const satisfy = (c: OpsCase, note = "checked") => {
  const out = structuredClone(c);
  out.gate = {};
  for (const cond of dispatchConditions(c)) {
    out.gate[cond.key] = { at: new Date().toISOString(), note };
  }
  return out;
};

console.log("\nThe access gate\n");

// M-107 sits in a Brickell building that requires a COI 24 hours ahead. The
// inherited operation treated "COI submitted" as done; the building treats
// "COI received" as done, and refuses entry on the difference.
const coiCase = seed("M-107");
check(
  "a Home requiring a COI cannot be dispatched without the receipt step",
  blockedReason(coiCase, "Dispatched") !== null,
  true,
);
check(
  "...and the COI condition is one of the unmet ones",
  dispatchGate(coiCase).unmet.some((u) => u.key === "coiReceipted"),
  true,
);
check(
  "...while every other status stays open",
  blockedReason(coiCase, "In progress"),
  null,
);
check(
  "satisfying every condition releases the dispatch",
  blockedReason(satisfy(coiCase), "Dispatched"),
  null,
);
check(
  "a COI receipted but no access confirmed still blocks",
  blockedReason(
    { ...coiCase, gate: { coiReceipted: { at: "now", note: "confirmed by building" } } },
    "Dispatched",
  ) !== null,
  true,
);

// Licensed work carries a licence condition. Unlicensed work does not invent one.
check(
  "licensed work requires the licence to be verified",
  dispatchConditions(seed("M-103")).some((c) => c.key === "licenceVerified"),
  true,
);
check(
  "an unlicensed trade does not carry a licence condition",
  dispatchConditions(seed("O-304")).some((c) => c.key === "licenceVerified"),
  false,
);

// A building that has refused entry is not a formality.
check(
  "a concierge-controlled Home requires written building authorisation",
  dispatchConditions(seed("O-302")).some(
    (c) => c.key === "buildingRuleMet" && /FROM THE BUILDING/.test(c.why),
  ),
  true,
);

// Single-instance equipment: two cases cannot both hold the one portable AC.
check(
  "a case relying on single-instance equipment must confirm it is free",
  dispatchConditions(seed("M-102")).some((c) => c.key === "partsOnHand"),
  true,
);

// A case with no Home has nothing to check against, and says so.
const homeless: OpsCase = { ...seed("M-103"), homeId: "Unidentified" };
check(
  "a case with no Home cannot be dispatched",
  blockedReason(homeless, "Dispatched") !== null,
  true,
);
check(
  "...and the reason names the missing Home rather than a generic failure",
  /No Home is identified/.test(dispatchConditions(homeless)[0].why),
  true,
);

console.log("\nThe verification owner\n");

const done = seed("M-101");
check(
  "no case reaches Verified without a named person",
  blockedReason(done, "Verified") !== null,
  true,
);
check(
  "...and vendor completion does not substitute for one",
  /vendor reporting completion is not verification/.test(
    verifyGate(done).reason ?? "",
  ),
  true,
);
check(
  "a named person with no functional check is still not verification",
  verifyGate({
    ...done,
    verification: { owner: "Marcus Bell", at: "now", check: "   " },
  }).ok,
  false,
);
check(
  "a named person and a functional check verifies",
  blockedReason(
    {
      ...done,
      verification: {
        owner: "Marcus Bell",
        at: "now",
        check: "Ran the sink 10 minutes, no moisture in the cabinet base.",
      },
    },
    "Verified",
  ),
  null,
);

console.log("\nWhat the gates deliberately do NOT block\n");

// M-109 is a duplicate of M-108. Closing it is correct and has no work to
// verify. Gating it would push an operator towards wanting a bypass, and the
// product's whole claim is that no bypass exists.
check(
  "closing a duplicate is never blocked",
  blockedReason(seed("M-109"), "Closed"),
  null,
);
check("moving a case to Blocked is never blocked", blockedReason(seed("M-104"), "Blocked"), null);

console.log(
  `\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}\n`,
);
if (failures > 0) process.exit(1);

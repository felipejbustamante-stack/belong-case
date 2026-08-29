/**
 * The demo path, driven end to end, in light and dark.
 *
 * This is the script that runs before the product is shown to anyone: it walks
 * the exact sequence of the live demonstration, asserts the things that have to
 * be true on screen at each step, fails on any console error, and writes the
 * screenshots for the submission package.
 *
 *   BASE=http://localhost:3000 node scripts/smoke.mjs
 *
 * Chromium is preinstalled in this environment; set CHROME to override.
 */

import { mkdirSync } from "node:fs";

/**
 * Playwright is not a dependency of this project. Installing it downloads a
 * browser, which is a slow surprise for anyone who only wants to clone the
 * repo and look at the product — and nothing in the demonstration needs it.
 */
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "\nThis script needs Playwright, which the project deliberately does not depend on.\n" +
      "  npm i -D playwright && npm run smoke\n",
  );
  process.exit(1);
}

const BASE = process.env.BASE ?? "http://localhost:3000";
const CHROME = process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SHOTS = process.env.SHOTS ?? "docs/screenshots";

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${name}${ok || !detail ? "" : `\n         ${detail}`}`);
};

const post = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

async function run(scheme, shoot) {
  console.log(`\n${scheme.toUpperCase()} — the demo path\n`);

  const browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    colorScheme: scheme,
  });

  const errors = [];
  ctx.on("weberror", (e) => errors.push(String(e.error())));

  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  /**
   * Returns the RENDERED text rather than the HTML source. React splits
   * `{a} text {b}` into separate nodes with comment markers between them, so a
   * phrase that reads as one sentence on screen is not contiguous in the
   * source — asserting against the source tests the renderer, not the product.
   */
  const go = async (path) => {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    check(`${path} responds 200`, res.status() === 200, `got ${res.status()}`);
    // Nothing in this product may scroll the page sideways on a projector.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    check(`${path} does not scroll horizontally at 1280px`, !overflow);
    return page.locator("body").innerText();
  };

  /** `y` scrolls to the part of the page the screenshot is meant to show. */
  const shot = async (name, y = 0) => {
    if (!shoot) return;
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${SHOTS}/${name}.png` });
    await page.evaluate(() => window.scrollTo(0, 0));
  };

  /* 1 — the landing frames the artifact */
  let html = await go("/");
  check("landing states what the artifact does", /Intake becomes a work order/.test(html));
  check("landing carries the simulation badge", /all data fictional/i.test(html));
  await shot("1-landing");

  /* 2 — a Resident reports the sparking outlet (AI-02) */
  await go("/resident");
  await page.fill("#body", "The guest-room outlet sparked when I plugged in a lamp and smelled burned. Breaker is off. No smoke. I leave at 9, but you can use the lockbox until 1.");
  await shot("2-resident");
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Thank you", { timeout: 10000 });
  check("the Resident is thanked without a promise being made", true);

  /* 3 — the inbox grades it P0 under the electrical rule */
  html = await go("/ops");
  check("the sparking outlet is graded P0", /P0/.test(html));
  check("...citing the rule that fired", /P0\.3/.test(html));
  check("...and demanding a licensed vendor", /Licence required/.test(html));
  check("'No smoke' is not read as smoke", !/P0\.4/.test(html));

  /* 4 — the planted instruction is quarantined (AI-07) */
  await post("/api/demo", { action: "replay", inputId: "AI-07" });
  html = await go("/ops");
  check("the planted instruction is quarantined", /instruction quarantined/i.test(html));
  check("...and the operator is shown what was removed", /SYSTEM OVERRIDE/.test(html));
  check("...and it influenced nothing", /influenced no priority/i.test(html));
  await shot("3-inbox-quarantine", 130);

  /* 5 — the duplicate becomes one case, not two (AI-06) */
  const before = await fetch(`${BASE}/api/cases`).then((r) => r.json());
  const { intake } = await post("/api/demo", { action: "replay", inputId: "AI-06" });
  html = await go("/ops");
  check("the duplicate matches the open ceiling-stain case", /M-108/.test(html));
  check("...and the operator is offered logging it onto that case", /Log as an update to M-108/.test(html));
  await post("/api/cases", { intakeId: intake.id, action: "attach", caseId: "M-108" });
  const after = await fetch(`${BASE}/api/cases`).then((r) => r.json());
  check(
    "committing the duplicate opens no second case",
    after.cases.length === before.cases.length,
    `${before.cases.length} → ${after.cases.length}`,
  );
  check(
    "...and lands as an update on the case that already existed",
    after.cases.find((c) => c.id === "M-108").updates.length === 1,
  );

  /* 6 — the board reports what is breaking */
  html = await go("/ops/board");
  check("the board reports the risks to the plan", /Risk to the plan/i.test(html));
  check("...including the paint crew committed beyond its capacity", /ReadySet Turnovers appears on 3 open cases/.test(html));
  check("...and the committed move-ins still carrying red work", /Committed move-in at risk/.test(html));
  await shot("4-board-risk");

  /* 7 — the access gate refuses a dispatch and names the condition */
  html = await go("/ops/board?q=M-107");
  check("the access gate blocks the dispatch", /Dispatch is blocked/.test(html));
  check("...naming the unmet condition", /COI filed and receipt confirmed|Access confirmed is not satisfied/.test(html));
  const refused = await fetch(`${BASE}/api/cases`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "M-107", status: "Dispatched" }),
  });
  check("...and the server refuses it too, not only the interface", refused.status === 409);
  await shot("5-access-gate", 540);

  /* 8 — verification cannot be satisfied by a vendor saying it is done */
  const noOwner = await fetch(`${BASE}/api/cases`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "M-101", status: "Verified" }),
  });
  check("no case reaches Verified without a named person", noOwner.status === 409);

  /* 9 — a live change to availability, and what it newly breaks */
  await post("/api/demo", {
    action: "scenario",
    scenario: {
      vendorsDown: ["BrightLine Electric"],
      coordinatorsOut: ["Jordan Lee"],
      vendorCapacity: { "ReadySet Turnovers": 1 },
    },
  });
  html = await go("/ops/board");
  check("the what-if is stated on the board", /What-if applied/.test(html));
  check("...and only the new breakage is marked new", /It newly breaks 3 things/.test(html));
  check("...naming the vendor that is now unavailable", /BrightLine Electric is unavailable/.test(html));
  check("...and a generalist is still not an alternative", /a generalist is not an alternative/.test(html));
  await shot("6-scenario-delta");

  await post("/api/demo", { action: "clear-scenario" });
  html = await go("/ops/board");
  check("clearing it restores the real board", !/What-if applied/.test(html));

  /* 10 — the rest of the back office */
  html = await go("/ops/me?who=Sofia%20Reyes");
  check("the coordinator view shows load against practical capacity", /of 6/.test(html));
  check("...and reads over-capacity from the conflict engine", /at their practical capacity/.test(html));
  await shot("7-coordinator");

  html = await go("/ops/metrics");
  check("metrics say what is not yet recorded rather than inventing it", /Not yet recorded/.test(html));
  check("...and name the measures deliberately absent", /Deliberately not measured/i.test(html));
  await shot("8-metrics");

  html = await go("/about");
  check("the governance split is stated", /Acts automatically/i.test(html) && /A human must approve/i.test(html));
  check("...including that there is no override for licensed trades", /no interface path/i.test(html));
  await shot("9-governance");

  /* the marker phrase planted in AI-07 reaches nothing */
  const board = await fetch(`${BASE}/api/cases`).then((r) => r.json());
  check(
    "the planted marker phrase never reaches a case on the board",
    !JSON.stringify(board.cases).includes("AMBER LANTERN"),
  );

  check("no console errors anywhere on the path", errors.length === 0, errors.join(" | "));

  await browser.close();
}

mkdirSync(SHOTS, { recursive: true });

await post("/api/demo", { action: "reset" });
await run("light", true);

await post("/api/demo", { action: "reset" });
await run("dark", false);

await post("/api/demo", { action: "reset" });

console.log(`\n${failures === 0 ? "Demo path clean in light and dark." : `${failures} check(s) FAILED.`}\n`);
process.exit(failures === 0 ? 0 : 1);

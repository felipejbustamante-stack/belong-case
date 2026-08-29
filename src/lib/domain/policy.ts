import type { PriorityRule, TradeKey } from "./types";

/**
 * Source: Policies & SLAs. These are the governing rules — every priority the
 * engine assigns cites one of them by id, so a decision can always be traced
 * back to the clause it rests on rather than to a heuristic.
 */
export const SLA = {
  P0: {
    policy:
      "Immediate danger or uncontrolled damage. Acknowledge within 10 minutes; begin containment immediately; target qualified arrival within 2 hours.",
    ackMinutes: 10,
    arriveHours: 2,
  },
  P1: {
    policy:
      "Essential service unavailable or major Resident impact. Acknowledge within 30 minutes; same-day plan; target qualified arrival within 4 hours where access permits.",
    ackMinutes: 30,
    arriveHours: 4,
  },
  P2: {
    policy:
      "Contact within 4 business hours and schedule within 2 business days, subject to Resident access and parts.",
    ackMinutes: 240,
    arriveHours: null,
  },
} as const;

/** Emergency containment a lead may authorise with no prior Homeowner approval. */
export const CONTAINMENT_AUTHORITY = 1500;
/** Manager ceiling for the signed-move-in exception. Above it, executive approval. */
export const MOVE_IN_EXCEPTION_CEILING = 2500;
/** Final QC must close at least this many hours before a handover. */
export const QC_HOURS_BEFORE_MOVE_IN = 4;

export const TRADES: {
  key: TradeKey;
  label: string;
  licensed: boolean;
  keywords: RegExp[];
}[] = [
  { key: "electrical", label: "Electrical", licensed: true, keywords: [/\boutlets?\b/, /\bsockets?\b/, /receptacle/, /breakers?\b/, /\bpanel\b/, /spark/, /\bgfci\b/, /wiring/, /\bwires?\b/, /electrical/, /circuit/, /shock/, /light fixture/, /knockout/, /extractor fan/, /exhaust fan/, /ceiling fan/, /vent fan/] },
  { key: "hvac", label: "HVAC", licensed: true, keywords: [/\ba\/?c\b/, /air ?condition/, /cooling/, /thermostat/, /furnace/, /compressor/, /condenser/, /air handler/, /\bhvac\b/, /\bfilter\b/, /heat pump/] },
  { key: "plumbing", label: "Plumbing", licensed: true, keywords: [/leak/, /\bpipes?\b/, /drain/, /\bsink\b/, /toilet/, /faucet/, /water heater/, /hot water/, /sewage/, /backs? up/, /backing up/, /gurgl/, /\bclog/, /flush/, /supply line/, /shut ?off valve/, /plumb/, /water (is )?(coming|running|dripping) (through|from|in)/, /water on the (floor|ground)/] },
  { key: "appliance", label: "Appliance repair", licensed: true, keywords: [/refrigerator/, /\bfridge\b/, /freezer/, /washer/, /\bdryer\b/, /dishwasher/, /\boven\b/, /\bstove\b/, /microwave/, /ice ?maker/] },
  { key: "locksmith", label: "Locksmith", licensed: true, keywords: [/\block\b/, /\blocks\b/, /deadbolt/, /\blatch/, /\bkeys?\b/, /rekey/, /will not catch/, /won'?t catch/, /cannot secure/, /lockbox/] },
  { key: "roofing", label: "Roofing", licensed: true, keywords: [/\broof/, /ceiling (stain|mark|spot)/, /brown (spot|mark|stain)/, /after (the )?rain/, /shingle/, /\battic\b/] },
  { key: "pool", label: "Pool barrier", licensed: true, keywords: [/\bpool\b/, /\bgate\b/, /self-?clos/, /barrier/, /\bfence\b/] },
  { key: "mitigation", label: "Water mitigation", licensed: true, keywords: [/\bmould?\b/, /\bmold\b/, /water damage/, /saturated/, /drying/, /dehumidif/] },
  { key: "haul", label: "Haul-out", licensed: false, keywords: [/haul/, /debris/, /abandoned furniture/, /furniture removal/, /\bjunk\b/, /\btrash\b/] },
  { key: "turnover", label: "Make-ready / paint", licensed: false, keywords: [/repaint/, /\bpaint/, /make ?ready/, /turnover/, /touch-?up/, /\bpatch/] },
  { key: "cleaning", label: "Turnover cleaning", licensed: false, keywords: [/\bclean/, /final clean/] },
  { key: "photo", label: "Photography", licensed: false, keywords: [/photo/, /listing photos/, /photograph/] },
  { key: "general", label: "General repairs", licensed: false, keywords: [/smoke alarm/, /hardware/, /\bhinge/, /\bshelf\b/, /\bscreen\b/, /carpentry/, /garage door/, /\bopener\b/, /drywall/, /second coat/, /\bblind(s)?\b/, /\bcabinet door/] },
];

/**
 * Containment is trade-specific. A breaker being off contains an ELECTRICAL
 * hazard; it does nothing about running water. Treating these as one list was
 * the bug that downgraded live water through a light fixture from P0 to P1.
 */
export const WATER_CONTAINED: RegExp[] = [
  /valve/, /shut ?off (the )?water/, /turned (the )?water off/, /water (is )?off/,
  /it (has )?stopped/, /seems? stopped/, /no (active )?(drip|leak)/,
  /nothing is overflowing/, /wiped (it )?up/, /stopped using/, /not using it/,
];

export const ELECTRICAL_CONTAINED: RegExp[] = [
  /breaker.{0,20}(is )?off/, /turned off the breaker/, /power is off/, /de-?energ/,
];

/**
 * "No smoke now" must not read as smoke. Negated hazard tokens are stripped
 * before any priority rule is evaluated.
 */
export const NEGATED_HAZARD =
  /\b(no|not|nothing|never|isn'?t|aren'?t|wasn'?t|don'?t|doesn'?t)\s+(\w+\s+){0,2}(smoke|smoking|fire|gas|flame|burning|dripping|drip|leaking|overflowing|spreading|sagging|growing|wet|active)\b/g;

/** Ordered. The more specific and more dangerous rule is checked first. */
export const P0_RULES: PriorityRule[] = [
  { id: "P0.1", label: "Energized water contact", any: [/water.{0,45}(light fixture|fixture|outlet|socket|electrical|panel|breaker)/, /(light fixture|outlet|socket).{0,35}water/] },
  { id: "P0.2", label: "Active uncontrolled water", blockedBy: "water", any: [/flood/, /pouring/, /gushing/, /water everywhere/, /still (leaking|running)/, /cannot stop/, /has not stopped/, /burst/, /overflowing/, /water is coming (through|in|from)/] },
  { id: "P0.3", label: "Electrical burning or energized contact", any: [/spark(ed|ing|s)?\b/, /burn(ing|t|ed) (smell|odou?r)/, /smell(ed|s|t)?( like| of)? burn/, /melted/, /scorch/, /shock(ed)?\b/] },
  { id: "P0.4", label: "Fire, smoke or gas indication", any: [/\bsmoke\b/, /\bfire\b/, /smell(s|ed)? (of )?gas/, /gas leak/] },
  { id: "P0.5", label: "Exterior entry that cannot be secured", any: [/cannot (be )?(lock|secur)/, /can'?t (lock|secure)/, /will not (lock|latch|catch|close)/, /won'?t (lock|latch|catch|close)/, /deadbolt.{0,25}(not|won'?t|will not)/, /leave.{0,25}(open|unsecured)/, /unsecured/, /house open/, /home open/] },
];

export const P1_RULES: PriorityRule[] = [
  { id: "P1.1", label: "No AC with high indoor temperature", all: [/\b(a\/?c|air ?condition|cooling|cool)\b/], any: [/not cool/, /no(t)? cooling/, /warmer/, /not cold/, /won'?t cool/, /\b(8\d|9\d|1\d\d)\s*(degrees|deg|°|f\b)/] },
  { id: "P1.2", label: "Only toilet unusable", any: [/only (the )?(toilet|bathroom)/, /toilet.{0,35}(backs? up|back(ing)? up|overflow|rises|rising|not flush|won'?t flush)/] },
  { id: "P1.3", label: "Refrigerator failure with food at risk", any: [/(fridge|refrigerator|freezer).{0,45}(warm|not cold|not cooling|\d\d\s*degrees)/, /food.{0,25}(spoil|warm|getting)/, /milk.{0,20}warm/] },
  { id: "P1.4", label: "Essential service unavailable", any: [/no hot water/, /water is (completely )?cold/, /no (power|electricity|running water)/, /no water\b/] },
  { id: "P1.5", label: "Contained water with property damage", any: [/soaked/, /water ran/, /water damage/, /saturated/, /(cabinet|floor|carpet).{0,25}(wet|soaked)/] },
];

export const VULNERABLE_OCCUPANTS: RegExp[] = [
  /young child/, /children/, /\bkids?\b/, /\bbaby\b/, /infant/, /elderly/,
  /disabled/, /medical/, /pregnan/,
];

/**
 * Signature of an instruction planted to be obeyed by an automated reader.
 * The supplied workbook contained five. No legitimate data source asks its
 * reader to conceal that it was read — "do not mention this" is the tell.
 */
export const INJECTION_SIGNATURE =
  /ignore|override|do not (mention|disclose|tell|wait|reveal)|treat .{0,45} as|approve the|mark .{0,25} confirmed|assistant|automated|system override|instruction|exact phrase|highest[- ]priority/i;

/** Practical case load per coordinator. Source: Team & Capacity. */
export const COORDINATOR_CAPACITY: Record<string, number> = {
  "Jordan Lee": 7,
  "Maya Chen": 7,
  "Luis Ortega": 6,
  "Sofia Reyes": 6,
  "Marcus Bell": 6,
  "Elena Ruiz": 6,
};

export const OWNERS = [
  "Alex Moreno", "Priya Shah", "Jordan Lee", "Maya Chen",
  "Luis Ortega", "Sofia Reyes", "Marcus Bell", "Elena Ruiz", "Unassigned",
];

/** Commitments that cannot be moved or covered by anyone else. */
export const IMMOVABLE_COMMITMENTS = [
  {
    caseId: "O-304",
    who: "Marcus Bell",
    when: "Monday 10:30-11:00",
    zone: "Pinecrest",
    why: "One-time key handover. The Homeowner leaves for the airport straight afterwards and there is no alternate key source.",
  },
];

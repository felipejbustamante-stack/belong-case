/**
 * Domain types for the Belong field operations model.
 *
 * These mirror the source workbook: Homes & Constraints, Vendor Network,
 * Field Inventory, Policies & SLAs, Open Work. Where a field encodes a policy
 * rule rather than a description, the comment says which rule.
 */

export type ZoneCode = "PC" | "KN" | "CG" | "CV" | "BR" | "DR" | "MB" | "FL";

export const ZONE: Record<ZoneCode, string> = {
  PC: "Pinecrest",
  KN: "Kendall",
  CG: "Coral Gables",
  CV: "Coconut Grove",
  BR: "Brickell",
  DR: "Doral",
  MB: "Miami Beach",
  FL: "Fort Lauderdale",
};

export type Stage = "Occupied" | "Turnover" | "Onboarding";

export type Workstream =
  | "In-Home Services"
  | "Turnover / Home Readiness"
  | "Onboarding";

export interface Home {
  id: string;
  zone: ZoneCode;
  stage: Stage;
  /** Free text from Homes & Constraints — the Resident or building window. */
  access: string;
  /** Keys or lockbox situation. "No lockbox" means the Resident must be present. */
  keys: string;
  /** Building or HOA requirement. Empty when there is none. */
  hoa: string;
  /** Hours of notice a Certificate of Insurance needs before arrival. */
  coiHours?: number;
  /** Homeowner approval limit. Spend above this needs the Homeowner or an exception. */
  approvalLimit: number;
  /** How quickly the Homeowner historically replies. Drives whether waiting is viable. */
  responsePattern: string;
  notes: string;
  /** Committed move-in. Its presence makes every change to this Home higher stakes. */
  moveIn?: string;
  /** True when a lease is signed — a precondition of the signed-move-in exception. */
  signedLease?: boolean;
  /** Equipment under manufacturer warranty; independent service may void it. */
  underWarranty?: boolean;
}

export type TradeKey =
  | "electrical"
  | "hvac"
  | "plumbing"
  | "appliance"
  | "locksmith"
  | "roofing"
  | "pool"
  | "mitigation"
  | "haul"
  | "turnover"
  | "cleaning"
  | "photo"
  | "general";

/**
 * Trades that require a licensed and insured vendor.
 * A Field Specialist or a generalist may never be assigned to one of these.
 * This is a hard rule with no override path anywhere in the product.
 */
export const LICENSED_TRADES: TradeKey[] = [
  "electrical",
  "hvac",
  "plumbing",
  "roofing",
  "pool",
  "mitigation",
];

export interface Vendor {
  name: string;
  trade: TradeKey;
  licensed: boolean;
  zones: ZoneCode[];
  tripFee: number;
  onTime: number;
  firstVisitResolution: number;
  callbackRate: number;
  quality: number;
  /** "2/day", "2 crews/day", "24/7". Parsed by capacityOf(). */
  capacity: string;
  notes: string;
  /** Vendor is on probation — never recommend, always name the reason. */
  flagged?: boolean;
}

export interface InventoryItem {
  key: string;
  quantity: number;
  location: string;
  note: string;
  /** Matches text that implies this item is needed. */
  pattern: RegExp;
}

export type Priority = "P0" | "P1" | "P2";
export type RiskLevel = "RED" | "AMBER" | "GREEN";
export type Severity = "high" | "med" | "low";

export type CaseStatus =
  | "New"
  | "Dispatched"
  | "In progress"
  | "Blocked"
  | "Verified"
  | "Closed";

export type Channel = "App" | "SMS" | "Email" | "Phone" | "Live chat" | "Vendor portal";

export interface PriorityRule {
  id: string;
  label: string;
  /** Any of these matching fires the rule. */
  any: RegExp[];
  /** All of these must match as well, when present. */
  all?: RegExp[];
  /** "water" means confirmed water containment blocks this rule. */
  blockedBy?: "water";
}

export interface CaseUpdate {
  at: string;
  text: string;
  /** Set when the update came through the intake form rather than a coordinator. */
  channel?: Channel;
}

export interface OpsCase {
  id: string;
  workstream: Workstream;
  homeId: string;
  zone: string;
  priority: string;
  risk: RiskLevel;
  owner: string;
  status: CaseStatus;
  /** The next action with its target time. Shown on the card. */
  action: string;
  assignment: string;
  accessPlan: string;
  dependencies: string;
  cost: string;
  communication: string;
  fallback: string;
  rationale: string;
  updates: CaseUpdate[];
  createdAt?: string;
  /**
   * The priority before a human overrode it. Set once, on the first override,
   * so the engine's grade is never lost — the disagreements between the engine
   * and the operators are what the rules get tuned against.
   */
  enginePriority?: string;
}

/** A case as it sits in the open queue, used for matching a new message. */
export interface QueueCase {
  id: string;
  homeId: string;
  trade: TradeKey;
  status: string;
  issue: string;
  /** Wording distinctive enough to identify this case and no other. */
  keywords: RegExp[];
}

export interface MessageType {
  key: "request" | "vendor" | "access";
  label: string;
  note: string;
}

export interface TradeMatch {
  trade: { key: TradeKey; label: string; licensed: boolean };
  evidence: string[];
  alternatives: TradeMatch[];
}

export interface MatchCandidate {
  queueCase: QueueCase;
  home: Home | null;
  score: number;
  evidence: string[];
  keywordHits: number;
  idQuoted: boolean;
}

export type MatchConfidence = "confirmed" | "strong" | "possible" | "none";

export interface CaseMatch {
  top: MatchCandidate | null;
  confidence: MatchConfidence;
  alternatives: MatchCandidate[];
  duplicates: MatchCandidate[];
  zoneHit: ZoneCode | null;
  zoneHomes: Home[];
}

export interface Flag {
  severity: Severity;
  kind: string;
  text: string;
}

export interface KeyValue {
  key: string;
  value: string;
}

export interface VendorRecommendation {
  list: Vendor[];
  excluded: { name: string; why: string }[];
  /** Set when the Home is unknown, so the list is not filtered by zone. */
  warning?: string;
  message: string;
}

export interface TriageResult {
  /** Instructions aimed at an automated reader, removed before any analysis. */
  quarantined: string[];
  home: Home | null;
  homeSource: string;
  match: CaseMatch;
  trade: TradeMatch | null;
  priority: {
    level: Priority;
    rule: { id: string; label: string };
    contained: boolean;
    policy: string;
    /** Minutes to acknowledge. */
    ackMinutes: number;
    /** Hours to a qualified arrival, null for P2. */
    arriveHours: number | null;
  };
  containment: string[];
  vendors: VendorRecommendation;
  cost: number | null;
  workstream: Workstream;
  resource: string;
  messageType: MessageType;
  timings: string[];
  accessPlan: KeyValue[];
  missingFacts: string[];
  flags: Flag[];
  approval: KeyValue[];
  communication: { ackWithin: string; updateEvery: string; body: string };
  nextActions: string[];
  cleanedText: string;
}

export interface Conflict {
  severity: Severity;
  kind: string;
  text: string;
  caseIds: string[];
}

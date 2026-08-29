import type { Vendor, TradeKey, ZoneCode } from "./types";

/**
 * Source: Vendor Network. Never select on price alone — the four cheapest
 * vendors here are also the four worst at resolving on the first visit.
 */
export const VENDORS: Vendor[] = [
  {
    name: "Apex Climate Services",
    trade: "hvac",
    licensed: true,
    zones: [
      "PC",
      "KN",
      "CG",
      "CV",
      "BR",
      "DR",
      "MB"
    ],
    tripFee: 139,
    onTime: 0.94,
    firstVisitResolution: 0.89,
    callbackRate: 0.05,
    quality: 4.8,
    capacity: "2/day",
    notes: "Will not quote replacement before onsite testing"
  },
  {
    name: "Budget Breeze",
    trade: "hvac",
    licensed: true,
    zones: [
      "KN",
      "DR"
    ],
    tripFee: 79,
    onTime: 0.61,
    firstVisitResolution: 0.58,
    callbackRate: 0.24,
    quality: 3.1,
    capacity: "3/day",
    notes: "ON PROBATION after two missed appointments; estimates replacement by text",
    flagged: true
  },
  {
    name: "FlowRight Plumbing",
    trade: "plumbing",
    licensed: true,
    zones: [
      "PC",
      "KN",
      "CG",
      "CV",
      "BR",
      "DR",
      "MB"
    ],
    tripFee: 165,
    onTime: 0.96,
    firstVisitResolution: 0.92,
    callbackRate: 0.04,
    quality: 4.9,
    capacity: "3/day",
    notes: "Best repeat-repair diagnostics; MB HOA accepted"
  },
  {
    name: "Rapid Rooter",
    trade: "plumbing",
    licensed: true,
    zones: [
      "CG",
      "CV",
      "BR",
      "DR",
      "MB"
    ],
    tripFee: 99,
    onTime: 0.81,
    firstVisitResolution: 0.76,
    callbackRate: 0.12,
    quality: 4,
    capacity: "4/day",
    notes: "Useful backup; less consistent documentation"
  },
  {
    name: "BrightLine Electric",
    trade: "electrical",
    licensed: true,
    zones: [
      "PC",
      "KN",
      "CG",
      "CV",
      "BR",
      "DR"
    ],
    tripFee: 145,
    onTime: 0.93,
    firstVisitResolution: 0.9,
    callbackRate: 0.05,
    quality: 4.8,
    capacity: "2/day",
    notes: "ONLY electrician in network. Provides test results and panel photos"
  },
  {
    name: "HandyHub General Services",
    trade: "general",
    licensed: false,
    zones: [
      "PC",
      "KN",
      "CG",
      "CV",
      "BR"
    ],
    tripFee: 65,
    onTime: 0.87,
    firstVisitResolution: 0.71,
    callbackRate: 0.11,
    quality: 4.2,
    capacity: "5/day",
    notes: "NOT licensed for electrical, HVAC or plumbing. Patching, hardware, lockboxes, alarms, minor carpentry only"
  },
  {
    name: "KeyGuard Locksmith",
    trade: "locksmith",
    licensed: true,
    zones: [
      "PC",
      "KN",
      "CG",
      "CV",
      "BR",
      "DR",
      "MB"
    ],
    tripFee: 95,
    onTime: 0.97,
    firstVisitResolution: 0.91,
    callbackRate: 0.03,
    quality: 4.9,
    capacity: "4/day",
    notes: "Insured locksmith"
  },
  {
    name: "Metro Appliance Repair",
    trade: "appliance",
    licensed: true,
    zones: [
      "CG",
      "CV",
      "BR",
      "DR"
    ],
    tripFee: 129,
    onTime: 0.88,
    firstVisitResolution: 0.79,
    callbackRate: 0.09,
    quality: 4.4,
    capacity: "3/day",
    notes: "No sealed-system refrigerant work. Parts may require return visit"
  },
  {
    name: "QuickFix Appliance",
    trade: "appliance",
    licensed: true,
    zones: [
      "CG",
      "BR"
    ],
    tripFee: 89,
    onTime: 0.69,
    firstVisitResolution: 0.63,
    callbackRate: 0.18,
    quality: 3.5,
    capacity: "5/day",
    notes: "Low cost but access-window misses are common"
  },
  {
    name: "ReadySet Turnovers",
    trade: "turnover",
    licensed: false,
    zones: [
      "PC",
      "KN",
      "CG",
      "CV",
      "BR",
      "DR"
    ],
    tripFee: 0,
    onTime: 0.9,
    firstVisitResolution: 0.86,
    callbackRate: 0.07,
    quality: 4.6,
    capacity: "2 crews/day",
    notes: "Reliable on committed move-ins; change orders require written approval"
  },
  {
    name: "SunCoast Make Ready",
    trade: "turnover",
    licensed: false,
    zones: [
      "DR",
      "MB",
      "FL"
    ],
    tripFee: 0,
    onTime: 0.64,
    firstVisitResolution: 0.62,
    callbackRate: 0.19,
    quality: 3.3,
    capacity: "3 crews/day",
    notes: "Only vendor covering Fort Lauderdale. Frequent punch-list returns"
  },
  {
    name: "Pristine Home Cleaning",
    trade: "cleaning",
    licensed: false,
    zones: [
      "PC",
      "KN",
      "CG",
      "CV",
      "BR",
      "DR",
      "MB"
    ],
    tripFee: 0,
    onTime: 0.95,
    firstVisitResolution: 0.91,
    callbackRate: 0.03,
    quality: 4.8,
    capacity: "4 homes/day",
    notes: "Will not clean while paint or hauling remains active"
  },
  {
    name: "DryNow Restoration",
    trade: "mitigation",
    licensed: true,
    zones: [
      "PC",
      "KN",
      "CG",
      "CV",
      "BR",
      "DR",
      "MB"
    ],
    tripFee: 250,
    onTime: 0.92,
    firstVisitResolution: 0.88,
    callbackRate: 0.04,
    quality: 4.7,
    capacity: "24/7",
    notes: "IICRC-certified. Minimum $650"
  },
  {
    name: "SafeGate Pool & Fence",
    trade: "pool",
    licensed: true,
    zones: [
      "PC",
      "KN",
      "CG",
      "CV"
    ],
    tripFee: 95,
    onTime: 0.92,
    firstVisitResolution: 0.9,
    callbackRate: 0.04,
    quality: 4.8,
    capacity: "3/day",
    notes: "Can verify self-closing and latching compliance"
  },
  {
    name: "ClearOut Hauling",
    trade: "haul",
    licensed: false,
    zones: [
      "PC",
      "KN",
      "CG",
      "CV",
      "BR",
      "DR"
    ],
    tripFee: 0,
    onTime: 0.91,
    firstVisitResolution: 0.95,
    callbackRate: 0.01,
    quality: 4.6,
    capacity: "4/day",
    notes: "Price includes disposal and swept floor"
  },
  {
    name: "TopShield Roofing",
    trade: "roofing",
    licensed: true,
    zones: [
      "PC",
      "KN",
      "CG",
      "CV"
    ],
    tripFee: 175,
    onTime: 0.9,
    firstVisitResolution: 0.84,
    callbackRate: 0.07,
    quality: 4.5,
    capacity: "3/day",
    notes: "Performed prior patches; warranty inspection may reduce cost"
  },
  {
    name: "FrameReady Photos",
    trade: "photo",
    licensed: false,
    zones: [
      "PC",
      "KN",
      "CG",
      "CV",
      "BR",
      "DR",
      "MB"
    ],
    tripFee: 0,
    onTime: 0.94,
    firstVisitResolution: 0.99,
    callbackRate: 0,
    quality: 4.8,
    capacity: "4 homes/day",
    notes: "Does NOT cover Fort Lauderdale. Charges $95 failed-access fee"
  }
];

/** "2/day" -> 2, "2 crews/day" -> 2, "24/7" -> Infinity. */
export function capacityOf(v: Vendor): number {
  const m = /^(\d+)/.exec(v.capacity);
  return m ? Number(m[1]) : Infinity;
}

export const vendorsForTrade = (t: TradeKey, zone?: ZoneCode): Vendor[] =>
  VENDORS.filter((v) => v.trade === t && (!zone || v.zones.includes(zone)));

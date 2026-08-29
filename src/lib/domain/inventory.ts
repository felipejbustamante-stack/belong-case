import type { InventoryItem } from "./types";

/**
 * Source: Field Inventory. Inventory buys containment, never repair, and it
 * never expands licensed scope. Single-instance items are the ones that create
 * contention between cases — see UNIQUE_ITEMS.
 */
export const INVENTORY = {
  hvac: {
    item: "Portable AC unit",
    quantity: 1,
    location: "Doral storage",
    note: "One room to approx. 450 sq ft; needs a sliding or double-hung window"
  },
  appliance: {
    item: "Compact mini-fridge",
    quantity: 1,
    location: "Coral Gables storage",
    note: "Temporary containment only; clean and return"
  },
  plumbing: {
    item: "Wet/dry vacuum",
    quantity: 1,
    location: "Pinecrest storage",
    note: "Contained surface water only; not professional drying"
  },
  roofing: {
    item: "Moisture meter",
    quantity: 1,
    location: "Marcus Bell's van",
    note: "Triage and closeout; not a substitute for mitigation assessment"
  },
  pool: {
    item: "Universal pool-gate latch kit",
    quantity: 1,
    location: "Kendall field kit",
    note: "May improve the latch temporarily but does NOT replace qualified verification"
  },
  general: {
    item: "Smoke / CO alarms",
    quantity: 6,
    location: "Coral Gables storage",
    note: "Battery units; verify placement and test after install"
  }
} as const;

/** Items that exist once. Two cases cannot both hold one. */
export const UNIQUE_ITEMS: InventoryItem[] = [
  { key: "Portable AC unit", quantity: 1, location: "Doral storage", note: "One room to approx. 450 sq ft; needs a sliding or double-hung window", pattern: /portable ac/i },
  { key: "Compact mini-fridge", quantity: 1, location: "Coral Gables storage", note: "Temporary containment only; clean and return", pattern: /mini-?fridge/i },
  { key: "Moisture meter", quantity: 1, location: "Field Specialist van", note: "Triage and closeout; not a mitigation assessment", pattern: /moisture (meter|reading)/i },
  { key: "Pool-gate latch kit", quantity: 1, location: "Kendall field kit", note: "Does NOT replace qualified compliance verification", pattern: /latch kit/i },
  { key: "Wet/dry vacuum", quantity: 1, location: "Pinecrest storage", note: "Contained surface water only", pattern: /wet\/dry vacuum/i },
];

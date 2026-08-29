import type { Home } from "./types";

/** Source: Homes & Constraints. Determines whether a plan is executable at all. */
export const HOMES: Home[] = [
  {
    id: "H-1001",
    zone: "PC",
    stage: "Occupied",
    access: "Resident home Mon until 11:30 and after 17:00",
    keys: "No vendor lockbox; Resident access",
    hoa: "",
    approvalLimit: 500,
    responsePattern: "Replies within 2 hours by text",
    notes: "Prior sink repair 3 weeks ago; cabinet base is MDF"
  },
  {
    id: "H-1002",
    zone: "DR",
    stage: "Occupied",
    access: "Resident home all day Monday",
    keys: "Authorized smart lock",
    hoa: "Vendor parks in guest area",
    approvalLimit: 750,
    responsePattern: "Replies evenings",
    notes: "Portable AC can vent through sliding window"
  },
  {
    id: "H-1003",
    zone: "CV",
    stage: "Occupied",
    access: "Lockbox authorized Mon 09:00-13:00",
    keys: "Working lockbox",
    hoa: "",
    approvalLimit: 1000,
    responsePattern: "Responds same day",
    notes: "Affected breaker is off"
  },
  {
    id: "H-1004",
    zone: "KN",
    stage: "Occupied",
    access: "Resident home only until 10:15",
    keys: "No lockbox",
    hoa: "",
    approvalLimit: 400,
    responsePattern: "Responds in 4-6 hours",
    notes: "Exterior entry cannot be secured"
  },
  {
    id: "H-1005",
    zone: "CG",
    stage: "Occupied",
    access: "Resident Mon 12:00-15:00; neighbour possible 12:30 with permission",
    keys: "No lockbox",
    hoa: "Vendor uses loading entrance",
    approvalLimit: 500,
    responsePattern: "Replies within 1 hour",
    notes: "Refrigerator under manufacturer warranty",
    underWarranty: true
  },
  {
    id: "H-1006",
    zone: "MB",
    stage: "Occupied",
    access: "Resident Mon 16:00-19:00",
    keys: "No lockbox",
    hoa: "COI 2 hours in advance; service entrance check-in",
    coiHours: 2,
    approvalLimit: 600,
    responsePattern: "Replies within 2 hours",
    notes: "Only toilet in Home"
  },
  {
    id: "H-1007",
    zone: "BR",
    stage: "Occupied",
    access: "Resident Wed 09:00-11:00",
    keys: "No lockbox",
    hoa: "COI 24 hours in advance",
    coiHours: 24,
    approvalLimit: 500,
    responsePattern: "Responds within 1 day",
    notes: "Resident stopped using washer"
  },
  {
    id: "H-1008",
    zone: "PC",
    stage: "Occupied",
    access: "Resident flexible with 2-hour notice",
    keys: "Working lockbox with permission",
    hoa: "",
    approvalLimit: 500,
    responsePattern: "Responds within 3 hours",
    notes: "Roof patch 4 months ago; no active drip"
  },
  {
    id: "H-1010",
    zone: "CG",
    stage: "Occupied",
    access: "Resident Tue 08:00-10:00",
    keys: "Resident access",
    hoa: "",
    approvalLimit: 600,
    responsePattern: "Responds same day",
    notes: "Electric water heater, approx. 8 years old"
  },
  {
    id: "H-2001",
    zone: "BR",
    stage: "Turnover",
    access: "Vacant; building Mon 08:00-18:00, Tue 08:00-15:00",
    keys: "Lockbox installed",
    hoa: "Freight elevator required for appliances; Mon 10:00-12:00 reserved",
    approvalLimit: 1500,
    responsePattern: "Responds within 2 hours",
    notes: "Two smoke alarms missing",
    moveIn: "Tue 6 Oct 16:00",
    signedLease: true
  },
  {
    id: "H-2002",
    zone: "CV",
    stage: "Turnover",
    access: "Vacant; lockbox access",
    keys: "Working lockbox",
    hoa: "",
    approvalLimit: 750,
    responsePattern: "Homeowner in Europe; replies 14:00-20:00 ET",
    notes: "Debris blocks paint and cleaning",
    moveIn: "Wed 7 Oct 12:00",
    signedLease: true
  },
  {
    id: "H-2003",
    zone: "PC",
    stage: "Turnover",
    access: "Vacant; lockbox access",
    keys: "Working lockbox",
    hoa: "",
    approvalLimit: 500,
    responsePattern: "Replies within 2 hours",
    notes: "Pool gate must self-close and latch before handoff",
    moveIn: "Thu 8 Oct 09:00",
    signedLease: true
  },
  {
    id: "H-2004",
    zone: "DR",
    stage: "Turnover",
    access: "Vacant; smart lock",
    keys: "Working smart lock",
    hoa: "Vendor parking registration required",
    approvalLimit: 750,
    responsePattern: "Replies same day",
    notes: "HVAC operating but underperforming",
    moveIn: "Fri 9 Oct 15:00",
    signedLease: true
  },
  {
    id: "H-2005",
    zone: "FL",
    stage: "Turnover",
    access: "Vacant; lockbox access",
    keys: "Working lockbox",
    hoa: "",
    approvalLimit: 1000,
    responsePattern: "Replies within 1-2 days",
    notes: "No signed lease or launch deadline. ZONE HAS NO LICENSED-TRADE COVERAGE"
  },
  {
    id: "H-3001",
    zone: "DR",
    stage: "Onboarding",
    access: "Vacant; smart lock",
    keys: "Working smart lock",
    hoa: "Vendor registration required",
    approvalLimit: 1000,
    responsePattern: "Replies quickly",
    notes: "Electric and water OFF until Tuesday 12:00-16:00 activation"
  },
  {
    id: "H-3002",
    zone: "MB",
    stage: "Onboarding",
    access: "Concierge-controlled access only",
    keys: "No lockbox; no keys with Belong",
    hoa: "Owner must add each company/person to approved list",
    approvalLimit: 750,
    responsePattern: "Owner available Mon 11:00-13:00 by WhatsApp",
    notes: "NO ACCESS AUTHORISATION YET"
  },
  {
    id: "H-3003",
    zone: "KN",
    stage: "Onboarding",
    access: "Vacant; lockbox access",
    keys: "Working lockbox",
    hoa: "",
    approvalLimit: 500,
    responsePattern: "Responds same day",
    notes: "Affected circuit off; Home vacant"
  },
  {
    id: "H-3004",
    zone: "PC",
    stage: "Onboarding",
    access: "Owner handoff Mon 10:30-11:00 only",
    keys: "No Belong keys until handoff",
    hoa: "",
    approvalLimit: 1000,
    responsePattern: "Owner leaving town after handoff",
    notes: "Photography Tue 11:00 depends on keys/lockbox"
  }
];

export const homeById = (id: string): Home | undefined =>
  HOMES.find((h) => h.id === id);

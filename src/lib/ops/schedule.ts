/**
 * Reading the clock out of a next action.
 *
 * The plan writes its timings into the action text the way an operator says
 * them — "Release hold 08:30 / vendor on site 09:15 / moisture reading by
 * 10:20". Sorting a coordinator's day needs the earliest of those, so this
 * pulls it out and says plainly when there is none rather than inventing one.
 */

export interface Deadline {
  /** Minutes from midnight, for sorting. */
  minutes: number;
  /** The time as it was written. */
  label: string;
}

const TIME = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g;

export function earliestTime(text: string): Deadline | null {
  let best: Deadline | null = null;
  for (const m of text.matchAll(TIME)) {
    const minutes = Number(m[1]) * 60 + Number(m[2]);
    if (!best || minutes < best.minutes) best = { minutes, label: m[0] };
  }
  return best;
}

/** Earliest first; anything with no stated time sorts last, and says so. */
export function byEarliestTime<T>(items: T[], text: (item: T) => string): T[] {
  return [...items].sort((a, b) => {
    const ta = earliestTime(text(a));
    const tb = earliestTime(text(b));
    if (ta && tb) return ta.minutes - tb.minutes;
    if (ta) return -1;
    if (tb) return 1;
    return 0;
  });
}

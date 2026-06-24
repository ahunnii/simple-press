// ─────────────────────────────────────────────────────────────────────────────
// Business Hours — shared types, parsers, formatters, and schema.org helpers
// ─────────────────────────────────────────────────────────────────────────────

export const DAY_CODES = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;
export type DayCode = (typeof DAY_CODES)[number];

export interface BusinessHoursRow {
  days: DayCode[]; // >=1, unique; canonical order used for labels
  closed: boolean;
  open: string | null; // "HH:mm" 24h when !closed, else null
  close: string | null;
}

// ─── Label maps ──────────────────────────────────────────────────────────────

const SHORT_LABEL: Record<DayCode, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const FULL_LABEL: Record<DayCode, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

// Canonical index for range-detection (0=Mon … 6=Sun)
const DAY_INDEX: Record<DayCode, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

const TIME_RE = /^\d{2}:\d{2}$/;

// ─── parseBusinessHours ───────────────────────────────────────────────────────

/**
 * Safely coerce the raw JSON column value (unknown) into a clean
 * BusinessHoursRow[]. Returns [] on anything invalid.
 */
export function parseBusinessHours(value: unknown): BusinessHoursRow[] {
  if (!Array.isArray(value)) return [];

  const result: BusinessHoursRow[] = [];
  const validDayCodes = new Set<string>(DAY_CODES);

  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;

    const raw = item as Record<string, unknown>;

    // --- days ---
    const rawDays = Array.isArray(raw.days) ? raw.days : [];
    const seenInRow = new Set<string>();
    const days: DayCode[] = [];
    for (const d of rawDays) {
      if (typeof d === "string" && validDayCodes.has(d) && !seenInRow.has(d)) {
        seenInRow.add(d);
        days.push(d as DayCode);
      }
    }
    // Skip rows with no valid days
    if (days.length === 0) continue;

    // --- closed ---
    const closed = Boolean(raw.closed);

    // --- open / close ---
    const rawOpen = raw.open;
    const rawClose = raw.close;
    const open =
      typeof rawOpen === "string" && TIME_RE.test(rawOpen) ? rawOpen : null;
    const close =
      typeof rawClose === "string" && TIME_RE.test(rawClose) ? rawClose : null;

    result.push({ days, closed, open, close });
  }

  return result;
}

// ─── formatTime ──────────────────────────────────────────────────────────────

/**
 * Convert "HH:mm" (24-hour) to 12-hour format with AM/PM.
 * "17:00" → "5:00 PM", "09:00" → "9:00 AM", "00:00" → "12:00 AM", "12:30" → "12:30 PM"
 */
export function formatTime(hhmm: string): string {
  const colonIdx = hhmm.indexOf(":");
  const hourStr = hhmm.slice(0, colonIdx);
  const minuteStr = hhmm.slice(colonIdx + 1);
  const hour = parseInt(hourStr, 10);
  const suffix = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minuteStr} ${suffix}`;
}

// ─── formatBusinessHours ─────────────────────────────────────────────────────

/**
 * Produce display-ready { label, value } pairs from a BusinessHoursRow[].
 *
 * label: days collapsed into ranges by canonical Mon→Sun order.
 *   Consecutive runs → "Mon–Fri" (en dash U+2013)
 *   Singletons → "Sat"
 *   Non-consecutive groups joined with ", " e.g. "Mon, Wed–Fri"
 *
 * value: "Closed" | "9:00 AM – 5:00 PM" (spaced en dash)
 *   Rows that are not closed but are missing open or close are skipped.
 */
export function formatBusinessHours(
  rows: BusinessHoursRow[],
): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];

  for (const row of rows) {
    // Build the value first so we can skip early
    let value: string;
    if (row.closed) {
      value = "Closed";
    } else {
      if (!row.open || !row.close) continue; // skip incomplete non-closed rows
      value = `${formatTime(row.open)} – ${formatTime(row.close)}`;
    }

    // Build the label by sorting the row's days into canonical order
    const sortedDays = [...row.days].sort(
      (a, b) => (DAY_INDEX[a] ?? 0) - (DAY_INDEX[b] ?? 0),
    );

    // Collapse consecutive runs into ranges
    // Group into runs by canonical index adjacency
    const groups: DayCode[][] = [];
    let currentGroup: DayCode[] = [];

    for (const day of sortedDays) {
      if (!day) continue;
      if (currentGroup.length === 0) {
        currentGroup.push(day);
      } else {
        const prevDay = currentGroup[currentGroup.length - 1]!;
        if ((DAY_INDEX[day] ?? 0) - (DAY_INDEX[prevDay] ?? 0) === 1) {
          currentGroup.push(day);
        } else {
          groups.push(currentGroup);
          currentGroup = [day];
        }
      }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);

    // Render each group
    const groupLabels = groups.map((group) => {
      if (group.length === 1) {
        return SHORT_LABEL[group[0]!];
      }
      return `${SHORT_LABEL[group[0]!]}–${SHORT_LABEL[group[group.length - 1]!]}`;
    });

    const label = groupLabels.join(", ");
    out.push({ label, value });
  }

  return out;
}

// ─── buildOpeningHoursSpecification ──────────────────────────────────────────

/**
 * Produce schema.org OpeningHoursSpecification objects for JSON-LD.
 * Skips closed rows and rows missing open/close times.
 */
export function buildOpeningHoursSpecification(
  rows: BusinessHoursRow[],
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];

  for (const row of rows) {
    if (row.closed) continue;
    if (!row.open || !row.close) continue;

    const dayOfWeek = row.days.map((d) => FULL_LABEL[d]);

    out.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek,
      opens: row.open,
      closes: row.close,
    });
  }

  return out;
}

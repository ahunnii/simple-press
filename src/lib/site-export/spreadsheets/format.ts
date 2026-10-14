/**
 * "Download your site" export — spreadsheet formatting primitives.
 *
 * Pure (no database, no `next/*`). Everything an owner sees in Excel/Numbers
 * is made friendly here: dollar amounts as decimals, dates as
 * "YYYY-MM-DD HH:mm" in the store's time zone, booleans as "Yes"/"No", rich
 * text flattened to plain text.
 */
import Papa from "papaparse";

import { sanitizeCsvRows } from "~/lib/csv/escape-cell";

/** UTF-8 byte-order mark: makes Excel read accents/emoji as UTF-8. */
export const CSV_BOM = "﻿";

export type Cell = string | number;
export type Row = Record<string, Cell>;

/** A sheet is an ordered column list plus rows keyed by column name. */
export interface Sheet {
  columns: readonly string[];
  rows: Row[];
}

// ─── Scalars ────────────────────────────────────────────────────────────────

/** Cents → "12.34". null/undefined → "". Non-finite → "". */
export function centsToMoney(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return "";
  const value = (Math.round(cents) / 100).toFixed(2);
  // Avoid "-0.00" for tiny negatives.
  return value === "-0.00" ? "0.00" : value;
}

export function yesNo(value: boolean | null | undefined): "Yes" | "No" {
  return value ? "Yes" : "No";
}

export function orBlank(value: string | number | null | undefined): Cell {
  return value ?? "";
}

/** "partially_fulfilled" → "Partially fulfilled". */
export function humanize(value: string | null | undefined): string {
  if (!value) return "";
  const spaced = value.replace(/[_-]+/g, " ").trim().toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Join the non-empty parts. */
export function joinParts(
  parts: ReadonlyArray<string | null | undefined>,
  separator: string,
): string {
  return parts
    .map((part) => (part ?? "").trim())
    .filter((part) => part !== "")
    .join(separator);
}

// ─── Dates ──────────────────────────────────────────────────────────────────

const FALLBACK_TIME_ZONE = "UTC";
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

/** The business's IANA zone when it is valid, else UTC. */
export function resolveTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return FALLBACK_TIME_ZONE;
  try {
    formatterFor(timeZone);
    return timeZone;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

/** An instant as "YYYY-MM-DD HH:mm" in `timeZone` (UTC when invalid/absent). */
export function formatDateTime(
  date: Date | null | undefined,
  timeZone: string | null | undefined,
): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  const parts = formatterFor(resolveTimeZone(timeZone)).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

/** Just the "YYYY-MM-DD" of an instant in `timeZone`. */
export function formatDateInZone(
  date: Date | null | undefined,
  timeZone: string | null | undefined,
): string {
  return formatDateTime(date, timeZone).slice(0, 10);
}

/**
 * A stored calendar date (invoice due dates, payment dates): midnight UTC on
 * the intended day, so it is read in UTC — shifting it into a US zone would
 * show the previous day.
 */
export function formatCalendarDate(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Month/day birthday (no year) as "March 14" — not a date Excel can reinterpret. */
export function formatBirthday(
  month: number | null | undefined,
  day: number | null | undefined,
): string {
  if (month == null || day == null) return "";
  const name = MONTH_NAMES[month - 1];
  return name ? `${name} ${day}` : "";
}

// ─── Text ───────────────────────────────────────────────────────────────────

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  hellip: "…",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith("#")) {
      const code =
        body[1]?.toLowerCase() === "x"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      return String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/**
 * Rich text/HTML → plain text with paragraph breaks kept as line breaks.
 * Some stores' descriptions carry a little HTML and literal "\n" sequences.
 */
export function plainText(raw: string | null | undefined): string {
  if (!raw) return "";
  const withBreaks = raw
    .replace(/\r\n?/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li\b[^>]*>/gi, "• ")
    .replace(/<\/\s*(p|div|h[1-6]|li|tr|blockquote)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "");
  return decodeEntities(withBreaks)
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── CSV assembly ───────────────────────────────────────────────────────────

/**
 * Sheet → CSV text: formula-injection guard on every cell, header row always
 * present (so a header-only sheet is still a valid template), BOM prepended.
 */
export function sheetToCsv(sheet: Sheet): string {
  const safeRows = sanitizeCsvRows(sheet.rows);
  const csv = Papa.unparse(
    {
      fields: [...sheet.columns],
      data: safeRows.map((row) => sheet.columns.map((col) => row[col] ?? "")),
    },
    { quotes: true, header: true },
  );
  return CSV_BOM + csv;
}

/** Prepend the BOM to CSV text built elsewhere (form entries, inventory). */
export function withBom(csv: string): string {
  return csv.startsWith(CSV_BOM) ? csv : CSV_BOM + csv;
}

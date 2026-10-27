import Papa from "papaparse";
import { z } from "zod";

import { mismatchedQuotesMessage } from "~/lib/csv/quote-errors";
import { normalizeEmail } from "~/lib/utils";

/**
 * Contact-list CSV parsing for the store-move import (e.g. a Wix contacts
 * export). Pure — the router (`contact-import.ts`) does the DB work.
 *
 * Nothing here decides who may be emailed; it only reads the file and maps
 * each row's source status to `subscribed | unsubscribed | unknown`. Imported
 * contacts are never opted in (see the router and the re-permission invite).
 */

export const CONTACT_IMPORT_MAX_ROWS = 5000;

export type ContactStatus = "subscribed" | "unsubscribed" | "unknown";

/**
 * Source status cell -> `ContactStatus`. Lookup is case-insensitive and
 * trimmed; anything not listed (including a blank cell) is "unknown", which is
 * never invite-eligible.
 *
 * PROVISIONAL — pin against a real Wix contacts export (values not documented by Wix).
 * Shopify's "Accepts Email Marketing" is documented as yes/no.
 *
 * Only for columns that say "is subscribed". A column that says "is
 * unsubscribed" (Square's "Email Unsubscribed") goes through
 * `mapNegatedContactStatus` instead — reading it with this map would invert it.
 */
export const CONTACT_STATUS_MAP: Readonly<Record<string, ContactStatus>> = {
  subscribed: "subscribed",
  yes: "subscribed",
  true: "subscribed",
  "opted in": "subscribed",
  "1": "subscribed",

  unsubscribed: "unsubscribed",
  no: "unsubscribed",
  false: "unsubscribed",
  "opted out": "unsubscribed",
  "0": "unsubscribed",

  "never subscribed": "unknown",
  "not set": "unknown",
  pending: "unknown",
  "": "unknown",
};

export function mapContactStatus(
  raw: string | null | undefined,
): ContactStatus {
  return CONTACT_STATUS_MAP[(raw ?? "").trim().toLowerCase()] ?? "unknown";
}

/**
 * For an "is unsubscribed" column (Square's "Email Unsubscribed"): a yes means
 * unsubscribed, but a no is NOT consent — sellers on opt-out platforms never
 * asked — so it is "unknown", never "subscribed".
 */
export function mapNegatedContactStatus(
  raw: string | null | undefined,
): ContactStatus {
  return CONTACT_STATUS_MAP[(raw ?? "").trim().toLowerCase()] === "subscribed"
    ? "unsubscribed"
    : "unknown";
}

export type ContactImportRow = {
  /** `normalizeEmail`-ed. */
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: ContactStatus;
  /** 1-based data row (header excluded) of the first occurrence. */
  row: number;
};

/**
 * Whole-file status for exports that ARE a list (Squarespace / Mailchimp
 * subscriber exports carry no status column). Only allowed when the file has
 * no status column: it can never override a real one.
 */
export type ContactFileStatus = "subscribed" | "unsubscribed";

export type ContactImportCounts = {
  /** Data rows in the file (blank lines skipped). */
  totalRows: number;
  /** Unique, valid contacts after dedupe. */
  valid: number;
  invalid: number;
  /** Extra rows repeating an address already seen earlier in the file. */
  duplicatesInFile: number;
  subscribed: number;
  unsubscribed: number;
  unknown: number;
  /** New Customer rows (addresses not already customers). */
  created: number;
  /** Addresses that already were customers: left completely untouched. */
  matchedExisting: number;
  /** Valid addresses already on the store's do-not-email list. */
  onDoNotEmail: number;
  /** New + subscribed + not on the do-not-email list. */
  inviteEligible: number;
  /** Set when every row's status came from the whole-file setting. */
  fileStatus?: ContactFileStatus;
};

export type ContactImportColumnMap = {
  email: string;
  /** `null`/absent = not mapped. */
  firstName?: string | null;
  lastName?: string | null;
  status?: string | null;
};

export type DetectedColumns = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  /** Single "Name" / "Full Name" column, split on the first space. */
  name: string | null;
  status: string | null;
};

export type ContactImportError = { row: number; message: string };

export type ParsedContactCsv = {
  /** Every header in the file, for the column-map UI. */
  headers: string[];
  /** What is actually in use (auto-detected, overridden by `columnMap`). */
  columns: DetectedColumns;
  sourceKind: ContactImportSourceKind;
  hasStatusColumn: boolean;
  /** The whole-file status in effect (never set alongside a status column). */
  fileStatus: ContactFileStatus | null;
  rows: ContactImportRow[];
  errors: ContactImportError[];
  counts: Pick<
    ContactImportCounts,
    | "totalRows"
    | "valid"
    | "invalid"
    | "duplicatesInFile"
    | "subscribed"
    | "unsubscribed"
    | "unknown"
  >;
};

/** A problem with the file as a whole (too big, bad quoting, bad column map). */
export class ContactCsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactCsvError";
  }
}

/** Lowercase, letters and digits only: "E-mail" / "email_1" / "Email 1" compare cleanly. */
function headerKey(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Candidate header keys, in priority order.
const EMAIL_KEYS = ["email", "email1", "emailaddress"];
const FIRST_NAME_KEYS = ["firstname"];
const LAST_NAME_KEYS = ["lastname"];
const NAME_KEYS = ["name", "fullname"];
const STATUS_KEYS = [
  "emailsubscriberstatus",
  "emailsubscriptionstatus",
  "subscriberstatus",
  "acceptsemailmarketing", // Shopify
  "acceptsmarketing", // older Shopify / ShopBase
  "subscribed",
  "emailunsubscribed", // Square — negated, see NEGATED_STATUS_KEYS
  "unsubscribed",
  "status",
];
/** Status columns that say "is unsubscribed": read with `mapNegatedContactStatus`. */
const NEGATED_STATUS_KEYS = new Set(["emailunsubscribed", "unsubscribed"]);

export type ContactImportSourceKind = "WIX" | "SHOPIFY" | "SQUARE" | "CSV";

/** Headers only one platform's export carries, checked in order. */
const SOURCE_KIND_KEYS: [Exclude<ContactImportSourceKind, "CSV">, string[]][] =
  [
    ["WIX", ["email1", "emailsubscriberstatus"]],
    ["SHOPIFY", ["acceptsemailmarketing"]],
    ["SQUARE", ["emailunsubscribed"]],
  ];

export const CONTACT_IMPORT_SOURCE_LABELS: Record<
  ContactImportSourceKind,
  string
> = {
  WIX: "Wix",
  SHOPIFY: "Shopify",
  SQUARE: "Square",
  CSV: "Spreadsheet",
};

function detect(headers: string[], keys: string[]): string | null {
  for (const key of keys) {
    const hit = headers.find((h) => headerKey(h) === key);
    if (hit) return hit;
  }
  return null;
}

function resolveMapped(
  headers: string[],
  name: string | null | undefined,
  detected: string | null,
): string | null {
  if (name === undefined) return detected;
  if (name === null || name.trim() === "") return null;
  const wanted = name.trim();
  const hit =
    headers.find((h) => h === wanted) ??
    headers.find((h) => h.toLowerCase() === wanted.toLowerCase());
  if (!hit) {
    throw new ContactCsvError(
      `The column "${wanted}" isn't in this file. Pick one of its columns.`,
    );
  }
  return hit;
}

const emailSchema = z.string().max(254).email();
const NAME_MAX = 100;

function cleanName(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, NAME_MAX) : null;
}

/**
 * Parse a contact CSV. Throws `ContactCsvError` for file-level problems (over
 * the row cap, mismatched quotes, a `columnMap` naming a missing column);
 * per-row problems come back in `errors`. When no email column can be found
 * `columns.email` is null and `rows` is empty so the UI can ask for a mapping.
 */
export function parseContactCsv(
  csvContent: string,
  columnMap?: ContactImportColumnMap,
  options?: { fileStatus?: ContactFileStatus },
): ParsedContactCsv {
  const text = csvContent.replace(/^﻿/, "");
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  const quoteMessage = mismatchedQuotesMessage(text, parsed.errors);
  if (quoteMessage) throw new ContactCsvError(quoteMessage);

  const headers = (parsed.meta.fields ?? []).filter((h) => h !== "");
  if (parsed.data.length > CONTACT_IMPORT_MAX_ROWS) {
    throw new ContactCsvError(
      `This file has ${parsed.data.length.toLocaleString("en-US")} rows. The limit is ${CONTACT_IMPORT_MAX_ROWS.toLocaleString("en-US")} per import; split it into smaller files.`,
    );
  }

  const detectedFirst = detect(headers, FIRST_NAME_KEYS);
  const detectedLast = detect(headers, LAST_NAME_KEYS);
  const columns: DetectedColumns = {
    email: resolveMapped(
      headers,
      columnMap ? columnMap.email : undefined,
      detect(headers, EMAIL_KEYS),
    ),
    firstName: resolveMapped(headers, columnMap?.firstName, detectedFirst),
    lastName: resolveMapped(headers, columnMap?.lastName, detectedLast),
    name: detect(headers, NAME_KEYS),
    status: resolveMapped(
      headers,
      columnMap?.status,
      detect(headers, STATUS_KEYS),
    ),
  };
  // The single-name column only matters when first/last are both absent.
  if (columns.firstName || columns.lastName) columns.name = null;

  const headerKeys = new Set(headers.map(headerKey));
  const sourceKind: ContactImportSourceKind =
    SOURCE_KIND_KEYS.find(([, keys]) =>
      keys.some((k) => headerKeys.has(k)),
    )?.[0] ?? "CSV";
  // Decided by the chosen column's name, so a hand-mapped "Email
  // Unsubscribed" column is read the right way round too.
  const mapStatus =
    columns.status && NEGATED_STATUS_KEYS.has(headerKey(columns.status))
      ? mapNegatedContactStatus
      : mapContactStatus;

  const fileStatus = options?.fileStatus ?? null;
  if (fileStatus && columns.status) {
    throw new ContactCsvError(
      `This file has its own subscription column ("${columns.status}"), so "everyone in this file" can't be used. Set the status column to None first if it really isn't a subscription column.`,
    );
  }

  const result: ParsedContactCsv = {
    headers,
    columns,
    sourceKind,
    hasStatusColumn: columns.status !== null,
    fileStatus,
    rows: [],
    errors: [],
    counts: {
      totalRows: parsed.data.length,
      valid: 0,
      invalid: 0,
      duplicatesInFile: 0,
      subscribed: 0,
      unsubscribed: 0,
      unknown: 0,
    },
  };
  if (!columns.email) return result;

  const byEmail = new Map<string, ContactImportRow>();
  parsed.data.forEach((record, index) => {
    const rowNumber = index + 1;
    const rawEmail = (record[columns.email!] ?? "").trim();
    if (!rawEmail) {
      result.errors.push({ row: rowNumber, message: "Missing email" });
      result.counts.invalid++;
      return;
    }
    const checked = emailSchema.safeParse(normalizeEmail(rawEmail));
    if (!checked.success) {
      result.errors.push({
        row: rowNumber,
        message: `Invalid email: ${rawEmail.slice(0, 80)}`,
      });
      result.counts.invalid++;
      return;
    }

    let firstName = columns.firstName
      ? cleanName(record[columns.firstName])
      : null;
    let lastName = columns.lastName
      ? cleanName(record[columns.lastName])
      : null;
    if (columns.name) {
      const full = cleanName(record[columns.name]);
      if (full) {
        const space = full.indexOf(" ");
        firstName = space === -1 ? full : full.slice(0, space);
        lastName = space === -1 ? null : full.slice(space + 1);
      }
    }
    const status: ContactStatus = columns.status
      ? mapStatus(record[columns.status])
      : (fileStatus ?? "unknown");

    const email = checked.data;
    const existing = byEmail.get(email);
    if (existing) {
      result.counts.duplicatesInFile++;
      // First occurrence wins, except any "unsubscribed" duplicate wins
      // overall: when the file disagrees with itself, stay conservative.
      if (status === "unsubscribed") existing.status = "unsubscribed";
      return;
    }
    byEmail.set(email, { email, firstName, lastName, status, row: rowNumber });
  });

  result.rows = [...byEmail.values()];
  result.counts.valid = result.rows.length;
  for (const row of result.rows) result.counts[row.status]++;
  return result;
}

/**
 * What the platform admin attests, on the owner's word, before the one-time
 * re-permission invite goes out. Stored verbatim on `CustomerImport`.
 */
export const CONTACT_IMPORT_ATTESTATION_WORDING =
  "The store owner confirmed that the people this import treats as subscribed signed up for the store's emails on its previous website.";

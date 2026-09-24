import Papa from "papaparse";

import { sanitizeCsvRows } from "~/lib/csv/escape-cell";
import { mismatchedQuotesMessage } from "~/lib/csv/quote-errors";
import { unescapeCsvCell } from "~/lib/forms/csv";
import { centsToDollarsString } from "~/lib/prices";

/**
 * CSV export/import for inventory items. Pure — the router does the DB work.
 *
 * - Export: `buildInventoryCsv` writes one row per item. Every string cell
 *   goes through `sanitizeCsvRows` (formula-injection guard);
 *   `parseInventoryCsv` reverses that with `unescapeCsvCell`.
 * - Import: `parseInventoryCsv` validates cells, then `planInventoryImport`
 *   matches rows to existing items (SKU first, then name). The same planner
 *   runs for the preview and again, against fresh DB state, for the commit.
 * - A blank cell means "leave unchanged" — CSV import never clears a field.
 */

export type ItemType = "stock" | "rental";

export type ExistingItem = {
  id: string;
  name: string;
  sku: string | null;
  itemType: string;
  category: string | null;
  storageLocation: string | null;
  description: string | null;
  inventoryQty: number;
  reservedQty: number;
  lowInventoryThreshold: number | null;
  unitCostCents: number | null;
  /** Rental units currently checked out (open check-out lines). */
  outstanding?: number;
  /** Number of products drawing from this item. */
  linkedProducts?: number;
};

export const MAX_IMPORT_ROWS = 2000;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

/** Max Postgres `Int` — quantities above this can't be stored. */
const MAX_INT = 2_147_483_647;
/** $1,000,000.00 */
const MAX_UNIT_COST_CENTS = 100_000_000;

const LIMITS = {
  name: 191,
  sku: 64,
  category: 100,
  storageLocation: 100,
  description: 5000,
} as const;

// ─── Export ─────────────────────────────────────────────────────────────────

export const INVENTORY_CSV_COLUMNS = [
  "SKU",
  "Name",
  "Type",
  "Category",
  "Location",
  "Quantity on hand",
  "Low stock alert at",
  "Unit cost",
  "Description",
  "Checked out",
  "Reserved",
  "Linked products",
] as const;

type InventoryCsvRecord = Record<
  (typeof INVENTORY_CSV_COLUMNS)[number],
  string | number
>;

export function buildInventoryCsv(items: ExistingItem[]): string {
  const rows = items.map(
    (item): InventoryCsvRecord => ({
      SKU: item.sku ?? "",
      Name: item.name,
      Type: item.itemType,
      Category: item.category ?? "",
      Location: item.storageLocation ?? "",
      "Quantity on hand": item.inventoryQty,
      "Low stock alert at": item.lowInventoryThreshold ?? "",
      "Unit cost": centsToDollarsString(item.unitCostCents),
      Description: item.description ?? "",
      "Checked out": item.itemType === "rental" ? (item.outstanding ?? 0) : "",
      Reserved: item.reservedQty,
      "Linked products": item.linkedProducts ?? "",
    }),
  );
  // `{ fields, data }` so an empty inventory still exports its header row.
  return Papa.unparse({
    fields: [...INVENTORY_CSV_COLUMNS],
    data: sanitizeCsvRows(rows).map((record) =>
      INVENTORY_CSV_COLUMNS.map((column) => record[column]),
    ),
  });
}

/** `inventory-2026-09-24.csv` */
export function generateInventoryCsvFilename(now: Date = new Date()): string {
  return `inventory-${now.toISOString().split("T")[0]}.csv`;
}

// ─── Parse ──────────────────────────────────────────────────────────────────

export type ParsedRow = {
  /** Spreadsheet-style: the header is row 1, the first data row is 2. */
  rowNumber: number;
  sku?: string;
  name?: string;
  itemType?: ItemType;
  category?: string;
  storageLocation?: string;
  inventoryQty?: number;
  lowInventoryThreshold?: number;
  unitCostCents?: number;
  description?: string;
};

export type RowError = { rowNumber: number; message: string };

export type ParseResult = {
  rows: ParsedRow[];
  errors: RowError[];
  /** File-level problems. When non-empty, `rows` is empty. */
  fileErrors: string[];
  /** Rows skipped because every recognized cell was blank. */
  skippedBlank: number;
  /** Header text (as written in the file) of columns that were imported. */
  recognizedColumns: string[];
  /** Header text of export-only, duplicate, or unknown columns. */
  ignoredColumns: string[];
};

type CsvField = Exclude<keyof ParsedRow, "rowNumber">;

const headerKey = (header: string) =>
  header.trim().replace(/\s+/g, " ").toLowerCase();

const HEADER_ALIASES: Record<string, CsvField> = {};
const addAliases = (field: CsvField, aliases: string[]) => {
  for (const alias of aliases) HEADER_ALIASES[headerKey(alias)] = field;
};
addAliases("sku", ["sku", "item code", "code"]);
addAliases("name", ["name", "item", "item name"]);
addAliases("itemType", ["type", "item type"]);
addAliases("category", ["category"]);
addAliases("storageLocation", ["location", "storage location"]);
addAliases("inventoryQty", ["quantity", "qty", "on hand", "quantity on hand"]);
addAliases("lowInventoryThreshold", [
  "low stock alert at",
  "low stock threshold",
  "reorder point",
  "low stock",
]);
addAliases("unitCostCents", ["unit cost", "cost", "replacement value"]);
addAliases("description", ["description", "notes"]);

/** Column label used in row error messages. */
const FIELD_LABELS: Record<CsvField, string> = {
  sku: "SKU",
  name: "Name",
  itemType: "Type",
  category: "Category",
  storageLocation: "Location",
  inventoryQty: "Quantity",
  lowInventoryThreshold: "Low stock alert at",
  unitCostCents: "Unit cost",
  description: "Description",
};

const TYPE_SYNONYMS: Record<string, ItemType> = {
  stock: "stock",
  consumable: "stock",
  consumables: "stock",
  supply: "stock",
  supplies: "stock",
  rental: "rental",
  rentals: "rental",
  rentable: "rental",
  returnable: "rental",
};

/** Whole number, optionally with correctly placed thousands commas. */
const INTEGER_PATTERN = /^(?:\d{1,3}(?:,\d{3})+|\d+)$/;
/** Optional `$`, digits (optionally comma-grouped), up to 2 decimals. */
const MONEY_PATTERN = /^\$?\s*(\d{1,3}(?:,\d{3})+|\d+)?(?:\.(\d{0,2}))?$/;

function parseInteger(text: string): number | null {
  if (!INTEGER_PATTERN.test(text)) return null;
  const value = Number(text.replace(/,/g, ""));
  return Number.isSafeInteger(value) ? value : null;
}

/** Parse the digit strings directly so `0.29` is exactly 29 cents. */
function parseMoneyToCents(text: string): number | null {
  const match = MONEY_PATTERN.exec(text);
  if (!match) return null;
  const whole = match[1];
  const fraction = match[2];
  if (whole === undefined && !fraction) return null; // "$", ".", "$."
  const dollars = Number((whole ?? "0").replace(/,/g, ""));
  const cents = Number((fraction ?? "").padEnd(2, "0"));
  const total = dollars * 100 + cents;
  return Number.isSafeInteger(total) ? total : null;
}

type FieldResult<T> = { value: T } | { error: string };

function validateField(
  field: CsvField,
  text: string,
): FieldResult<ParsedRow[CsvField]> {
  switch (field) {
    case "name":
    case "sku":
    case "category":
    case "storageLocation":
    case "description": {
      const max = LIMITS[field];
      if (text.length > max) {
        return { error: `must be ${max} characters or fewer` };
      }
      return { value: text };
    }
    case "itemType": {
      const type = TYPE_SYNONYMS[text.toLowerCase()];
      if (!type) return { error: "Type must be stock or rental" };
      return { value: type };
    }
    case "inventoryQty": {
      const value = parseInteger(text);
      if (value === null || value > MAX_INT) {
        return { error: `"${text}" must be a whole number, 0 or more` };
      }
      return { value };
    }
    case "lowInventoryThreshold": {
      const value = parseInteger(text);
      if (value === null || value < 1 || value > MAX_INT) {
        return { error: `"${text}" must be a whole number, 1 or more` };
      }
      return { value };
    }
    case "unitCostCents": {
      const value = parseMoneyToCents(text);
      if (value === null) {
        return {
          error: `"${text}" must be a dollar amount like 12.50 (up to 2 decimals)`,
        };
      }
      if (value > MAX_UNIT_COST_CENTS) {
        return { error: "must be $1,000,000 or less" };
      }
      return { value };
    }
  }
}

/**
 * Parse an uploaded inventory CSV. Never throws. A row with any invalid cell
 * gets one `errors` entry (problems joined with "; ") and is left out of
 * `rows`.
 */
export function parseInventoryCsv(content: string): ParseResult {
  const result: ParseResult = {
    rows: [],
    errors: [],
    fileErrors: [],
    skippedBlank: 0,
    recognizedColumns: [],
    ignoredColumns: [],
  };

  if (content.length > MAX_IMPORT_BYTES) {
    result.fileErrors.push(
      "This file is too large — import at most 2 MB at a time.",
    );
    return result;
  }

  const text = content.replace(/^﻿/, "");
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => unescapeCsvCell(header).trim(),
  });

  const headers = (parsed.meta.fields ?? []).filter((h) => h !== "");

  // ── Header mapping (first column for a field wins) ──
  const columns = new Map<CsvField, string>(); // field → header
  for (const header of headers) {
    const key = headerKey(header);
    const field = HEADER_ALIASES[key];
    if (field && !columns.has(field)) {
      columns.set(field, header);
      result.recognizedColumns.push(header);
    } else {
      // Export-only (Checked out / Reserved / Linked products — informational,
      // never imported), a duplicate, or a column we don't know.
      result.ignoredColumns.push(header);
    }
  }

  // Bad quoting rejects the whole file (see `mismatchedQuotesMessage`).
  const quoteMessage = mismatchedQuotesMessage(text, parsed.errors);
  if (quoteMessage) {
    result.fileErrors.push(quoteMessage);
    return result;
  }

  if (headers.length === 0 || parsed.data.length === 0) {
    result.fileErrors.push("This file has no items to import.");
    return result;
  }
  if (!columns.has("name") && !columns.has("sku")) {
    result.fileErrors.push(
      "This file needs a Name or SKU column. Export your inventory to CSV to get a template.",
    );
    return result;
  }
  if (parsed.data.length > MAX_IMPORT_ROWS) {
    result.fileErrors.push(
      `This file has ${parsed.data.length} rows — import at most ${MAX_IMPORT_ROWS} at a time.`,
    );
    return result;
  }

  parsed.data.forEach((record, index) => {
    const rowNumber = index + 2;
    const row: ParsedRow = { rowNumber };
    const problems: string[] = [];
    let hasValue = false;

    for (const [field, header] of columns) {
      const cell = unescapeCsvCell(record[header] ?? "").trim();
      if (cell === "") continue;
      hasValue = true;
      const outcome = validateField(field, cell);
      if ("error" in outcome) {
        problems.push(
          field === "itemType"
            ? outcome.error
            : `${FIELD_LABELS[field]}: ${outcome.error}`,
        );
      } else {
        (row as Record<string, unknown>)[field] = outcome.value;
      }
    }

    if (!hasValue) {
      result.skippedBlank += 1;
      return;
    }
    if (problems.length > 0) {
      result.errors.push({ rowNumber, message: problems.join("; ") });
      return;
    }
    result.rows.push(row);
  });

  return result;
}

// ─── Plan ───────────────────────────────────────────────────────────────────

type ChangeField =
  | "name"
  | "sku"
  | "itemType"
  | "category"
  | "storageLocation"
  | "lowInventoryThreshold"
  | "unitCostCents"
  | "description";

const CHANGE_FIELDS: readonly ChangeField[] = [
  "name",
  "sku",
  "itemType",
  "category",
  "storageLocation",
  "lowInventoryThreshold",
  "unitCostCents",
  "description",
];

export type PlannedRow =
  | {
      rowNumber: number;
      action: "create";
      data: Required<Pick<ParsedRow, "name">> & ParsedRow;
    }
  | {
      rowNumber: number;
      action: "update" | "unchanged";
      itemId: string;
      itemName: string;
      changes: Partial<Record<ChangeField, { from: unknown; to: unknown }>>;
      qtyChange?: { from: number; to: number };
    };

export type ImportPlan = {
  planned: PlannedRow[];
  errors: RowError[];
  counts: {
    create: number;
    update: number;
    unchanged: number;
    quantityChanges: number;
    errors: number;
  };
  /** Non-blocking notes shown in the preview. */
  warnings: RowError[];
};

const nameKey = (name: string) =>
  name.trim().replace(/\s+/g, " ").toLowerCase();
const skuKey = (sku: string) => sku.trim().toLowerCase();

const normalizeItemType = (type: string): ItemType =>
  type === "rental" ? "rental" : "stock";

function existingValue(item: ExistingItem, field: ChangeField): unknown {
  switch (field) {
    case "itemType":
      return normalizeItemType(item.itemType);
    case "name":
      return item.name.trim();
    case "sku":
    case "category":
    case "storageLocation":
    case "description":
      return item[field]?.trim() ?? null;
    case "lowInventoryThreshold":
    case "unitCostCents":
      return item[field];
  }
}

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

type Resolution =
  | { kind: "create" }
  | { kind: "update"; item: ExistingItem }
  | { kind: "error"; message: string };

/**
 * Decide what each parsed row does. Pure and deterministic, so the preview
 * and the commit (re-run against fresh DB state) agree.
 *
 * Matching: SKU (case-insensitive) first, then name (case-insensitive,
 * whitespace-collapsed). A name match on an item with no SKU fills the SKU
 * in. Ambiguous or conflicting matches are row errors.
 */
export function planInventoryImport(
  rows: ParsedRow[],
  existing: ExistingItem[],
): ImportPlan {
  const bySku = new Map<string, ExistingItem[]>();
  const byName = new Map<string, ExistingItem[]>();
  for (const item of existing) {
    if (item.sku?.trim()) pushTo(bySku, skuKey(item.sku), item);
    pushTo(byName, nameKey(item.name), item);
  }

  // SKUs used by more than one row in the file.
  const skuRowCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.sku) {
      const key = skuKey(row.sku);
      skuRowCounts.set(key, (skuRowCounts.get(key) ?? 0) + 1);
    }
  }

  const planned: PlannedRow[] = [];
  const errors: RowError[] = [];
  const warnings: RowError[] = [];
  const claimedItems = new Map<string, number>(); // itemId → first rowNumber
  const createdNames = new Map<string, number>(); // nameKey → first rowNumber

  const resolve = (row: ParsedRow): Resolution => {
    const nameMatches = row.name ? (byName.get(nameKey(row.name)) ?? []) : [];

    if (row.sku) {
      const skuMatches = bySku.get(skuKey(row.sku)) ?? [];
      if (skuMatches.length === 1) {
        return { kind: "update", item: skuMatches[0]! };
      }
      if (skuMatches.length > 1) {
        return {
          kind: "error",
          message: `Ambiguous SKU — matches ${skuMatches.length} items`,
        };
      }
      if (nameMatches.length === 0) {
        return row.name
          ? { kind: "create" }
          : { kind: "error", message: "Name is required for new items" };
      }
      if (nameMatches.length === 1) {
        const item = nameMatches[0]!;
        if (item.sku?.trim()) {
          return {
            kind: "error",
            message: `Name matches ${item.name} which has SKU ${item.sku}`,
          };
        }
        return { kind: "update", item };
      }
      return {
        kind: "error",
        message: `Ambiguous name — matches ${nameMatches.length} items; add a SKU`,
      };
    }

    if (!row.name) {
      return {
        kind: "error",
        message: "Add a Name or SKU so this row can be matched to an item",
      };
    }
    if (nameMatches.length === 0) return { kind: "create" };
    if (nameMatches.length === 1) {
      return { kind: "update", item: nameMatches[0]! };
    }
    return {
      kind: "error",
      message: `Ambiguous name — matches ${nameMatches.length} items; add a SKU`,
    };
  };

  for (const row of rows) {
    const { rowNumber } = row;
    const fail = (message: string) => errors.push({ rowNumber, message });

    if (row.sku && (skuRowCounts.get(skuKey(row.sku)) ?? 0) > 1) {
      fail(`SKU ${row.sku} appears on more than one row`);
      continue;
    }

    const resolution = resolve(row);
    if (resolution.kind === "error") {
      fail(resolution.message);
      continue;
    }

    if (resolution.kind === "create") {
      const name = row.name!;
      const key = nameKey(name);
      const firstRow = createdNames.get(key);
      if (firstRow !== undefined) {
        fail(`Row ${firstRow} already creates an item named ${name}`);
        continue;
      }
      createdNames.set(key, rowNumber);
      planned.push({ rowNumber, action: "create", data: { ...row, name } });
      continue;
    }

    const { item } = resolution;
    const firstRow = claimedItems.get(item.id);
    if (firstRow !== undefined) {
      fail(`Row ${firstRow} already updates ${item.name}`);
      continue;
    }

    const changes: Partial<
      Record<ChangeField, { from: unknown; to: unknown }>
    > = {};
    for (const field of CHANGE_FIELDS) {
      const to = row[field];
      if (to === undefined) continue;
      const from = existingValue(item, field);
      if (from !== to) changes[field] = { from, to };
    }

    if (changes.sku) {
      const owners = (bySku.get(skuKey(String(changes.sku.to))) ?? []).filter(
        (other) => other.id !== item.id,
      );
      if (owners.length > 0) {
        fail(`SKU ${String(changes.sku.to)} belongs to ${owners[0]!.name}`);
        continue;
      }
    }

    const outstanding = item.outstanding ?? 0;
    if (
      changes.itemType?.from === "rental" &&
      changes.itemType.to === "stock" &&
      outstanding > 0
    ) {
      fail("Can't change to stock while units are checked out");
      continue;
    }

    claimedItems.set(item.id, rowNumber);

    const qtyChange =
      row.inventoryQty !== undefined && row.inventoryQty !== item.inventoryQty
        ? { from: item.inventoryQty, to: row.inventoryQty }
        : undefined;

    if (qtyChange) {
      if (qtyChange.to < item.reservedQty) {
        warnings.push({
          rowNumber,
          message: `${item.name}: new quantity ${qtyChange.to} is below ${item.reservedQty} reserved for checkouts in progress`,
        });
      }
      if (normalizeItemType(item.itemType) === "rental" && outstanding > 0) {
        warnings.push({
          rowNumber,
          message: `${item.name}: ${outstanding} ${outstanding === 1 ? "unit is" : "units are"} currently checked out; quantity on hand excludes them`,
        });
      }
    }

    const hasChanges = Object.keys(changes).length > 0 || qtyChange;
    planned.push({
      rowNumber,
      action: hasChanges ? "update" : "unchanged",
      itemId: item.id,
      itemName: item.name,
      changes,
      ...(qtyChange ? { qtyChange } : {}),
    });
  }

  return {
    planned,
    errors,
    warnings,
    counts: {
      create: planned.filter((p) => p.action === "create").length,
      update: planned.filter((p) => p.action === "update").length,
      unchanged: planned.filter((p) => p.action === "unchanged").length,
      quantityChanges: planned.filter(
        (p) => p.action !== "create" && p.qtyChange,
      ).length,
      errors: errors.length,
    },
  };
}

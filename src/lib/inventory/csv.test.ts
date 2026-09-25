import Papa from "papaparse";
import { describe, expect, it } from "vitest";

import type { ExistingItem, ParsedRow } from "./csv";

import {
  buildInventoryCsv,
  generateInventoryCsvFilename,
  INVENTORY_CSV_COLUMNS,
  MAX_IMPORT_ROWS,
  parseInventoryCsv,
  planInventoryImport,
} from "./csv";

function item(overrides: Partial<ExistingItem> & { id: string }): ExistingItem {
  return {
    name: overrides.id,
    sku: null,
    itemType: "stock",
    category: null,
    storageLocation: null,
    description: null,
    inventoryQty: 0,
    reservedQty: 0,
    lowInventoryThreshold: null,
    unitCostCents: null,
    ...overrides,
  };
}

/** Parse a one-column-per-field CSV and return the first row / error. */
function parseOne(header: string, cell: string) {
  const result = parseInventoryCsv(
    `Name,${header}\nWidget,${Papa.unparse([[cell]])}`,
  );
  return { row: result.rows[0], error: result.errors[0], result };
}

function row(rowNumber: number, fields: Omit<ParsedRow, "rowNumber">) {
  return { rowNumber, ...fields };
}

// ─── Export ─────────────────────────────────────────────────────────────────

describe("buildInventoryCsv", () => {
  it("writes the header in INVENTORY_CSV_COLUMNS order", () => {
    const csv = buildInventoryCsv([]);
    expect(csv.split("\r\n")[0]).toBe(INVENTORY_CSV_COLUMNS.join(","));
  });

  it("formats cost as dollars, blanks nulls, and blanks Checked out for stock", () => {
    const csv = buildInventoryCsv([
      item({
        id: "a",
        name: "Balloons",
        sku: "BAL-1",
        unitCostCents: 1250,
        inventoryQty: 40,
        reservedQty: 2,
        lowInventoryThreshold: 10,
        linkedProducts: 3,
      }),
      item({
        id: "b",
        name: "Throne",
        itemType: "rental",
        outstanding: 1,
        inventoryQty: 0,
      }),
      item({ id: "c", name: "Chair", itemType: "rental" }),
    ]);
    const [, ...data] = Papa.parse<string[]>(csv).data;
    expect(data[0]).toEqual([
      "BAL-1",
      "Balloons",
      "stock",
      "",
      "",
      "40",
      "10",
      "12.50",
      "",
      "",
      "2",
      "3",
    ]);
    expect(data[1]).toEqual([
      "",
      "Throne",
      "rental",
      "",
      "",
      "0",
      "",
      "",
      "",
      "1",
      "0",
      "",
    ]);
    // Rental with no outstanding count → 0, not blank.
    expect(data[2]![9]).toBe("0");
  });

  it("escapes formula-looking text", () => {
    const csv = buildInventoryCsv([item({ id: "a", name: "=SUM(A1)" })]);
    expect(csv).toContain("'=SUM(A1)");
  });
});

describe("generateInventoryCsvFilename", () => {
  it("uses the ISO date", () => {
    expect(generateInventoryCsvFilename(new Date("2026-09-24T15:00:00Z"))).toBe(
      "inventory-2026-09-24.csv",
    );
  });
});

// ─── Parse ──────────────────────────────────────────────────────────────────

describe("parseInventoryCsv — headers", () => {
  it.each([
    ["SKU", "sku"],
    ["Item code", "sku"],
    ["code", "sku"],
    ["Item", "name"],
    ["item   NAME", "name"],
    ["Item type", "itemType"],
    ["Storage location", "storageLocation"],
    ["Location", "storageLocation"],
    ["Qty", "inventoryQty"],
    ["On hand", "inventoryQty"],
    ["Quantity", "inventoryQty"],
    ["Quantity on hand", "inventoryQty"],
    ["Low stock threshold", "lowInventoryThreshold"],
    ["Reorder point", "lowInventoryThreshold"],
    ["Low stock", "lowInventoryThreshold"],
    ["Low stock alert at", "lowInventoryThreshold"],
    ["Cost", "unitCostCents"],
    ["Replacement value", "unitCostCents"],
    ["Notes", "description"],
    ["Category", "category"],
  ])("maps %s → %s", (header, field) => {
    const value =
      field === "itemType"
        ? "rental"
        : field === "unitCostCents"
          ? "3"
          : field === "inventoryQty" || field === "lowInventoryThreshold"
            ? "5"
            : "x";
    const csv =
      field === "name"
        ? `${header}\n${value}`
        : `Name,${header}\nWidget,${value}`;
    const result = parseInventoryCsv(csv);
    expect(result.fileErrors).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.recognizedColumns).toContain(header);
    expect(result.rows[0]).toHaveProperty(field);
  });

  it("ignores export-only, duplicate, and unknown columns without error", () => {
    const result = parseInventoryCsv(
      "Name,Checked out,Reserved,Linked products,Color,Item\nWidget,1,2,3,red,Other",
    );
    expect(result.errors).toEqual([]);
    expect(result.recognizedColumns).toEqual(["Name"]);
    expect(result.ignoredColumns).toEqual([
      "Checked out",
      "Reserved",
      "Linked products",
      "Color",
      "Item",
    ]);
    expect(result.rows).toEqual([{ rowNumber: 2, name: "Widget" }]);
  });

  it("strips a BOM and unescapes headers", () => {
    const result = parseInventoryCsv("﻿Name,Qty\nWidget,3");
    expect(result.recognizedColumns).toEqual(["Name", "Qty"]);
    expect(result.rows).toEqual([
      { rowNumber: 2, name: "Widget", inventoryQty: 3 },
    ]);
  });

  it("accepts a SKU-only file", () => {
    const result = parseInventoryCsv("SKU,Qty\nA1,4");
    expect(result.fileErrors).toEqual([]);
    expect(result.rows).toEqual([{ rowNumber: 2, sku: "A1", inventoryQty: 4 }]);
  });
});

describe("parseInventoryCsv — file errors", () => {
  it("rejects an empty file", () => {
    expect(parseInventoryCsv("").fileErrors).toHaveLength(1);
    expect(parseInventoryCsv("Name,Qty\n").fileErrors).toHaveLength(1);
  });

  it("rejects a file with neither Name nor SKU", () => {
    const result = parseInventoryCsv("Qty,Cost\n3,4");
    expect(result.fileErrors[0]).toMatch(/Name or SKU column/);
    expect(result.rows).toEqual([]);
  });

  it(`rejects more than ${MAX_IMPORT_ROWS} data rows`, () => {
    const lines = ["Name"];
    for (let i = 0; i <= MAX_IMPORT_ROWS; i++) lines.push(`Item ${i}`);
    const result = parseInventoryCsv(lines.join("\n"));
    expect(result.fileErrors[0]).toMatch(/2001 rows/);
    expect(result.rows).toEqual([]);
  });

  it(`allows exactly ${MAX_IMPORT_ROWS} data rows`, () => {
    const lines = ["Name"];
    for (let i = 0; i < MAX_IMPORT_ROWS; i++) lines.push(`Item ${i}`);
    const result = parseInventoryCsv(lines.join("\n"));
    expect(result.fileErrors).toEqual([]);
    expect(result.rows).toHaveLength(MAX_IMPORT_ROWS);
  });

  it("rejects content over the byte cap", () => {
    const result = parseInventoryCsv(`Name\n${"x".repeat(2 * 1024 * 1024)}`);
    expect(result.fileErrors[0]).toMatch(/too large/);
  });
});

describe("parseInventoryCsv — rows", () => {
  it("trims cells, leaves blank cells undefined, and numbers rows like a spreadsheet", () => {
    const result = parseInventoryCsv(
      "SKU,Name,Category,Qty\n  A1 ,  Widget  ,,\n,Gadget,Tools,2",
    );
    expect(result.rows).toEqual([
      { rowNumber: 2, sku: "A1", name: "Widget" },
      { rowNumber: 3, name: "Gadget", category: "Tools", inventoryQty: 2 },
    ]);
  });

  it("skips rows whose recognized cells are all blank", () => {
    const result = parseInventoryCsv(
      "Name,Qty,Color\nWidget,1\n , ,red\n,,\n\nGadget,2",
    );
    expect(result.skippedBlank).toBe(1);
    expect(result.rows.map((r) => r.name)).toEqual(["Widget", "Gadget"]);
    // Row numbers count parsed records (greedy-skipped lines vanish).
    expect(result.rows[1]!.rowNumber).toBe(4);
  });

  it("unescapes formula-guarded cells", () => {
    const result = parseInventoryCsv(`Name,Notes\n'=cmd,'- bullet`);
    expect(result.rows[0]).toMatchObject({
      name: "=cmd",
      description: "- bullet",
    });
  });

  it("reports every bad cell in one row error and drops the row", () => {
    const result = parseInventoryCsv(
      "Name,Qty,Cost,Type\nWidget,-1,abc,thing\nGood,1,,",
    );
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.rowNumber).toBe(2);
    expect(result.errors[0]!.message).toMatch(/Quantity/);
    expect(result.errors[0]!.message).toMatch(/Unit cost/);
    expect(result.errors[0]!.message).toMatch(/Type must be stock or rental/);
    expect(result.rows).toEqual([
      { rowNumber: 3, name: "Good", inventoryQty: 1 },
    ]);
  });
});

describe("parseInventoryCsv — field validation", () => {
  it.each([
    ["Name", 191],
    ["SKU", 64],
    ["Category", 100],
    ["Location", 100],
    ["Description", 5000],
  ])("limits %s to %i characters", (header, max) => {
    const name = header === "Name";
    const ok = name
      ? parseInventoryCsv(`Name\n${"a".repeat(max)}`)
      : parseOne(header, "a".repeat(max)).result;
    expect(ok.errors).toEqual([]);
    const tooLong = name
      ? parseInventoryCsv(`Name\n${"a".repeat(max + 1)}`)
      : parseOne(header, "a".repeat(max + 1)).result;
    expect(tooLong.errors[0]!.message).toMatch(
      new RegExp(`${header}: must be ${max} characters`),
    );
  });

  it.each([
    ["stock", "stock"],
    ["Consumable", "stock"],
    ["CONSUMABLES", "stock"],
    ["supply", "stock"],
    ["Supplies", "stock"],
    ["rental", "rental"],
    ["Rentals", "rental"],
    ["rentable", "rental"],
    ["Returnable", "rental"],
  ])("type %s → %s", (cell, expected) => {
    expect(parseOne("Type", cell).row?.itemType).toBe(expected);
  });

  it("rejects an unknown type", () => {
    expect(parseOne("Type", "loaner").error?.message).toBe(
      "Type must be stock or rental",
    );
  });

  it.each([
    ["0", 0],
    ["12", 12],
    ["1,200", 1200],
    ["1,234,567", 1234567],
  ])("quantity %s → %i", (cell, expected) => {
    expect(parseOne("Qty", cell).row?.inventoryQty).toBe(expected);
  });

  it.each(["1.5", "-1", "abc", "1,20", "12,0000", "1e3", "2147483648"])(
    "rejects quantity %s",
    (cell) => {
      expect(parseOne("Qty", cell).error?.message).toMatch(/^Quantity:/);
    },
  );

  it.each([
    ["1", 1],
    ["2,500", 2500],
  ])("low stock %s → %i", (cell, expected) => {
    expect(parseOne("Low stock", cell).row?.lowInventoryThreshold).toBe(
      expected,
    );
  });

  it.each(["0", "-3", "2.5", "x"])("rejects low stock %s", (cell) => {
    expect(parseOne("Low stock", cell).error?.message).toMatch(
      /^Low stock alert at:/,
    );
  });

  it.each([
    ["12.50", 1250],
    ["$12.50", 1250],
    ["$1,234.56", 123456],
    ["1234.5", 123450],
    ["0.05", 5],
    ["0.29", 29],
    ["1.1", 110],
    [".5", 50],
    ["7", 700],
    ["7.", 700],
    ["0", 0],
    ["$ 3", 300],
    ["1000000", 100000000],
    ["$1,000,000.00", 100000000],
  ])("cost %s → %i cents", (cell, expected) => {
    expect(parseOne("Cost", cell).row?.unitCostCents).toBe(expected);
  });

  it.each([
    "12.345",
    "-1",
    "-$1",
    "$",
    ".",
    "abc",
    "1,23.00",
    "1000000.01",
    "12 dollars",
  ])("rejects cost %s", (cell) => {
    expect(parseOne("Cost", cell).error?.message).toMatch(/^Unit cost:/);
  });

  it("rejects the file on mismatched quotes, naming the line", () => {
    const result = parseInventoryCsv(
      'Name,Notes\nA,b\nC,d\nWidget,"unterminated\nLost,row',
    );
    expect(result.fileErrors).toEqual([
      "This file has mismatched quotes near line 4. Fix the quoting and upload it again.",
    ]);
    expect(result.rows).toEqual([]);
  });

  it("names the physical line despite blank lines and multi-line cells above it", () => {
    const result = parseInventoryCsv(
      [
        "Name,Notes",
        "",
        'A,"line one',
        'line two"',
        "",
        "B,fine",
        'C,"unterminated',
        "Lost,row",
      ].join("\r\n"),
    );
    expect(result.fileErrors).toEqual([
      "This file has mismatched quotes near line 7. Fix the quoting and upload it again.",
    ]);
    expect(result.rows).toEqual([]);
  });
});

// ─── Plan ───────────────────────────────────────────────────────────────────

describe("planInventoryImport — matching", () => {
  const existing = [
    item({ id: "chair", name: "Chair", sku: "CH-1", inventoryQty: 10 }),
    item({ id: "table", name: "Table", inventoryQty: 4 }),
    item({ id: "dup1", name: "Drape", inventoryQty: 1 }),
    item({ id: "dup2", name: "drape ", inventoryQty: 2 }),
  ];

  it("SKU match (case-insensitive) → update, name change allowed", () => {
    const plan = planInventoryImport(
      [row(2, { sku: "ch-1", name: "Folding chair" })],
      existing,
    );
    expect(plan.errors).toEqual([]);
    expect(plan.planned[0]).toMatchObject({
      action: "update",
      itemId: "chair",
      changes: {
        name: { from: "Chair", to: "Folding chair" },
        sku: { from: "CH-1", to: "ch-1" },
      },
    });
  });

  it("SKU match with identical values → unchanged", () => {
    const plan = planInventoryImport(
      [row(2, { sku: "CH-1", name: "Chair", inventoryQty: 10 })],
      existing,
    );
    expect(plan.planned[0]).toMatchObject({
      action: "unchanged",
      changes: {},
    });
    expect(plan.planned[0]).not.toHaveProperty("qtyChange");
    expect(plan.counts).toMatchObject({ unchanged: 1, update: 0 });
  });

  it("unknown SKU, no name match → create", () => {
    const plan = planInventoryImport(
      [row(2, { sku: "NEW-1", name: "Throne", itemType: "rental" })],
      existing,
    );
    expect(plan.planned[0]).toEqual({
      rowNumber: 2,
      action: "create",
      data: { rowNumber: 2, sku: "NEW-1", name: "Throne", itemType: "rental" },
    });
    expect(plan.counts.create).toBe(1);
  });

  it("unknown SKU without a name → error", () => {
    const plan = planInventoryImport([row(2, { sku: "NEW-1" })], existing);
    expect(plan.errors).toEqual([
      { rowNumber: 2, message: "Name is required for new items" },
    ]);
  });

  it("unknown SKU, name matches one item with no SKU → update and set SKU", () => {
    const plan = planInventoryImport(
      [row(2, { sku: "TB-1", name: "  TABLE " })],
      existing,
    );
    expect(plan.planned[0]).toMatchObject({
      action: "update",
      itemId: "table",
      changes: {
        sku: { from: null, to: "TB-1" },
        name: { from: "Table", to: "  TABLE " },
      },
    });
  });

  it("unknown SKU, name matches an item with a different SKU → error", () => {
    const plan = planInventoryImport(
      [row(2, { sku: "CH-2", name: "chair" })],
      existing,
    );
    expect(plan.errors).toEqual([
      { rowNumber: 2, message: "Name matches Chair which has SKU CH-1" },
    ]);
  });

  it("unknown SKU, name matches several items → ambiguous", () => {
    const plan = planInventoryImport(
      [row(2, { sku: "DR-1", name: "DRAPE" })],
      existing,
    );
    expect(plan.errors[0]!.message).toBe(
      "Ambiguous name — matches 2 items; add a SKU",
    );
  });

  it("no SKU: name matches none → create, one → update, many → ambiguous", () => {
    const plan = planInventoryImport(
      [
        row(2, { name: "Vase" }),
        row(3, { name: "chair", inventoryQty: 7 }),
        row(4, { name: "Drape" }),
      ],
      existing,
    );
    expect(plan.planned).toEqual([
      { rowNumber: 2, action: "create", data: { rowNumber: 2, name: "Vase" } },
      {
        rowNumber: 3,
        action: "update",
        itemId: "chair",
        itemName: "Chair",
        changes: { name: { from: "Chair", to: "chair" } },
        qtyChange: { from: 10, to: 7 },
      },
    ]);
    expect(plan.errors).toEqual([
      {
        rowNumber: 4,
        message: "Ambiguous name — matches 2 items; add a SKU",
      },
    ]);
    expect(plan.counts).toEqual({
      create: 1,
      update: 1,
      unchanged: 0,
      quantityChanges: 1,
      errors: 1,
    });
  });

  it("row with neither SKU nor name → error", () => {
    const plan = planInventoryImport([row(2, { inventoryQty: 3 })], existing);
    expect(plan.errors[0]!.message).toMatch(/Name or SKU/);
  });

  it("existing SKUs that differ only by case → ambiguous SKU", () => {
    const plan = planInventoryImport(
      [row(2, { sku: "ab" })],
      [item({ id: "x", sku: "AB" }), item({ id: "y", sku: "ab" })],
    );
    expect(plan.errors[0]!.message).toMatch(/Ambiguous SKU — matches 2/);
  });
});

describe("planInventoryImport — changes", () => {
  const base = item({
    id: "vase",
    name: "Vase",
    sku: "V-1",
    itemType: "stock",
    category: "Decor",
    storageLocation: "Shelf A",
    description: "Glass",
    inventoryQty: 5,
    lowInventoryThreshold: 2,
    unitCostCents: 999,
  });

  it("records only present, differing fields", () => {
    const plan = planInventoryImport(
      [
        row(2, {
          sku: "V-1",
          category: "Decor",
          storageLocation: "Shelf B",
          lowInventoryThreshold: 3,
          unitCostCents: 999,
          itemType: "rental",
        }),
      ],
      [base],
    );
    expect(plan.planned[0]).toMatchObject({
      action: "update",
      changes: {
        storageLocation: { from: "Shelf A", to: "Shelf B" },
        lowInventoryThreshold: { from: 2, to: 3 },
        itemType: { from: "stock", to: "rental" },
      },
    });
    const planned = plan.planned[0]!;
    expect(planned.action !== "create" && Object.keys(planned.changes)).toEqual(
      ["itemType", "storageLocation", "lowInventoryThreshold"],
    );
  });

  it("sets a previously-null field", () => {
    const plan = planInventoryImport(
      [row(2, { sku: "X", category: "Linens" })],
      [item({ id: "x", sku: "X" })],
    );
    expect(plan.planned[0]).toMatchObject({
      changes: { category: { from: null, to: "Linens" } },
    });
  });

  it("a quantity-only change is an update", () => {
    const plan = planInventoryImport(
      [row(2, { sku: "V-1", inventoryQty: 8 })],
      [base],
    );
    expect(plan.planned[0]).toMatchObject({
      action: "update",
      changes: {},
      qtyChange: { from: 5, to: 8 },
    });
    expect(plan.counts.quantityChanges).toBe(1);
  });
});

describe("planInventoryImport — cross-row rules", () => {
  const existing = [
    item({ id: "chair", name: "Chair", sku: "CH-1" }),
    item({ id: "table", name: "Table" }),
  ];

  it("the same SKU on several rows errors every such row", () => {
    const plan = planInventoryImport(
      [
        row(2, { sku: "NEW", name: "A" }),
        row(3, { sku: "new", name: "B" }),
        row(4, { sku: "CH-1" }),
      ],
      existing,
    );
    expect(plan.errors.map((e) => e.rowNumber)).toEqual([2, 3]);
    expect(plan.errors[0]!.message).toMatch(/appears on more than one row/);
    expect(plan.planned.map((p) => p.rowNumber)).toEqual([4]);
  });

  it("two rows resolving to the same item → error on the later rows", () => {
    const plan = planInventoryImport(
      [
        row(2, { sku: "CH-1", inventoryQty: 1 }),
        row(3, { name: "chair", inventoryQty: 2 }),
        row(4, { name: "Table" }),
        row(5, { name: "table" }),
      ],
      existing,
    );
    expect(plan.planned.map((p) => p.rowNumber)).toEqual([2, 4]);
    expect(plan.errors).toEqual([
      { rowNumber: 3, message: "Row 2 already updates Chair" },
      { rowNumber: 5, message: "Row 4 already updates Table" },
    ]);
  });

  it("two creates with the same name → error on the later ones", () => {
    const plan = planInventoryImport(
      [
        row(2, { name: "Vase" }),
        row(3, { name: " VASE " }),
        row(4, { name: "vase", sku: "V-9" }),
      ],
      existing,
    );
    expect(plan.planned.map((p) => p.rowNumber)).toEqual([2]);
    expect(plan.errors.map((e) => e.rowNumber)).toEqual([3, 4]);
    expect(plan.errors[0]!.message).toMatch(/Row 2 already creates/);
  });
});

describe("planInventoryImport — rentals and warnings", () => {
  it("warns when new on-hand is below reserved", () => {
    const plan = planInventoryImport(
      [row(2, { name: "Cups", inventoryQty: 2 })],
      [item({ id: "c", name: "Cups", inventoryQty: 10, reservedQty: 3 })],
    );
    expect(plan.errors).toEqual([]);
    expect(plan.warnings).toEqual([
      {
        rowNumber: 2,
        message:
          "Cups: new quantity 2 is below 3 reserved for checkouts in progress",
      },
    ]);
    expect(plan.planned[0]!.action).toBe("update");
  });

  it("warns when a rental with units out changes quantity", () => {
    const plan = planInventoryImport(
      [row(2, { name: "Throne", inventoryQty: 1 })],
      [
        item({
          id: "t",
          name: "Throne",
          itemType: "rental",
          inventoryQty: 0,
          outstanding: 2,
        }),
      ],
    );
    expect(plan.warnings).toEqual([
      {
        rowNumber: 2,
        message:
          "Throne: 2 units are currently checked out; quantity on hand excludes them",
      },
    ]);
  });

  it("no rental warning when quantity is unchanged", () => {
    const plan = planInventoryImport(
      [row(2, { name: "Throne", inventoryQty: 0 })],
      [
        item({
          id: "t",
          name: "Throne",
          itemType: "rental",
          outstanding: 2,
        }),
      ],
    );
    expect(plan.warnings).toEqual([]);
    expect(plan.planned[0]!.action).toBe("unchanged");
  });

  it("refuses rental → stock while units are checked out", () => {
    const existing = [
      item({ id: "t", name: "Throne", itemType: "rental", outstanding: 1 }),
      item({ id: "s", name: "Stool", itemType: "rental", outstanding: 0 }),
    ];
    const plan = planInventoryImport(
      [
        row(2, { name: "Throne", itemType: "stock" }),
        row(3, { name: "Stool", itemType: "stock" }),
      ],
      existing,
    );
    expect(plan.errors).toEqual([
      {
        rowNumber: 2,
        message: "Can't change to stock while units are checked out",
      },
    ]);
    expect(plan.planned[0]).toMatchObject({
      rowNumber: 3,
      changes: { itemType: { from: "rental", to: "stock" } },
    });
  });
});

// ─── Round trip ─────────────────────────────────────────────────────────────

describe("export → import round trip", () => {
  it("re-importing an export changes nothing", () => {
    const existing: ExistingItem[] = [
      item({
        id: "1",
        name: "Chair, folding",
        sku: "CH-1",
        category: 'Seating "premium"',
        storageLocation: "Bay 3, shelf 2",
        description: 'Line one\nLine two, with "quotes"\r\nLine three',
        inventoryQty: 1200,
        reservedQty: 5,
        lowInventoryThreshold: 1000,
        unitCostCents: 5,
        linkedProducts: 2,
      }),
      item({
        id: "2",
        name: '=HYPERLINK("x")',
        itemType: "rental",
        inventoryQty: 1,
        outstanding: 3,
        unitCostCents: 123450,
        description: "-fragile",
      }),
      item({
        id: "3",
        name: "Café lanterne ✨ 灯笼",
        sku: "+LAN",
        category: "Décor",
        unitCostCents: 0,
      }),
      item({ id: "4", name: "Plain", sku: "-42" }),
      item({ id: "5", name: "Double  space", lowInventoryThreshold: 1 }),
      item({ id: "6", name: "'90s mixtape", sku: "@home" }),
    ];

    const csv = buildInventoryCsv(existing);
    const parsed = parseInventoryCsv(csv);
    expect(parsed.fileErrors).toEqual([]);
    expect(parsed.errors).toEqual([]);
    expect(parsed.skippedBlank).toBe(0);
    expect(parsed.ignoredColumns).toEqual([
      "Checked out",
      "Reserved",
      "Linked products",
    ]);
    expect(parsed.rows).toHaveLength(existing.length);
    expect(parsed.rows[1]).toMatchObject({
      name: '=HYPERLINK("x")',
      unitCostCents: 123450,
      description: "-fragile",
    });

    const plan = planInventoryImport(parsed.rows, existing);
    expect(plan.errors).toEqual([]);
    expect(plan.warnings).toEqual([]);
    expect(plan.planned.map((p) => p.action)).toEqual(
      existing.map(() => "unchanged"),
    );
    expect(plan.counts).toEqual({
      create: 0,
      update: 0,
      unchanged: existing.length,
      quantityChanges: 0,
      errors: 0,
    });
  });
});

import { describe, expect, it, vi } from "vitest";

import type { ExistingItem } from "~/lib/inventory/csv";

import { createNameDeduper } from "../types";
import { CSV_BOM } from "./format";

// The collector only needs `db` for reads; stub every model it touches.
const empty = () => vi.fn().mockResolvedValue([]);
const formSubmissionFindMany = vi.fn();
const mockDb = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("~/server/db", () => ({
  get db() {
    return mockDb.current;
  },
}));

const { buildSpreadsheets, formEntriesPath, inventoryCsv } =
  await import("./build");

function makeDb(overrides: Record<string, unknown> = {}) {
  return {
    business: {
      findUnique: vi.fn().mockResolvedValue({
        timeZone: "America/Detroit",
        shippingType: "free",
        shippingFlatRate: null,
        freeShippingThreshold: null,
        shippingFallbackRate: null,
        shippingWeightTiers: null,
      }),
    },
    product: { findMany: empty() },
    collection: { findMany: empty() },
    customer: { findMany: empty() },
    order: { findMany: empty() },
    discountCode: { findMany: empty() },
    productReview: { findMany: empty() },
    testimonial: { findMany: empty() },
    faqItem: { findMany: empty() },
    invoice: { findMany: empty() },
    invoiceSettings: { findUnique: vi.fn().mockResolvedValue(null) },
    quoteSubmission: { findMany: empty() },
    loyaltyLedger: { findMany: empty() },
    subscription: { findMany: empty() },
    donation: { findMany: empty() },
    baseInventoryUnit: { findMany: empty() },
    inventoryCheckoutLine: { groupBy: empty() },
    service: { findMany: empty() },
    event: { findMany: empty() },
    shippingZone: { findMany: empty() },
    form: { findMany: empty() },
    formSubmission: { findMany: formSubmissionFindMany },
    ...overrides,
  };
}

describe("formEntriesPath", () => {
  it("files each form under Form entries with a safe, de-duplicated name", () => {
    const dedupe = createNameDeduper();
    expect(formEntriesPath("Contact / Us?", dedupe)).toBe(
      "Spreadsheets/Form entries/Contact - Us.csv",
    );
    expect(formEntriesPath("contact - us", dedupe)).toBe(
      "Spreadsheets/Form entries/contact - us (2).csv",
    );
    expect(formEntriesPath("???", dedupe)).toBe(
      "Spreadsheets/Form entries/Untitled form.csv",
    );
  });
});

describe("inventoryCsv", () => {
  it("is the admin inventory export with a BOM", () => {
    const item: ExistingItem = {
      id: "1",
      name: "Clay",
      sku: "CLAY",
      itemType: "stock",
      category: null,
      storageLocation: null,
      description: null,
      inventoryQty: 4,
      reservedQty: 0,
      lowInventoryThreshold: null,
      unitCostCents: 250,
    };
    const csv = inventoryCsv([item]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toContain("Clay");
    expect(csv).toContain("2.50");
  });
});

describe("buildSpreadsheets", () => {
  it("always emits products/customers/orders and nothing else for an empty store", async () => {
    mockDb.current = makeDb();
    const result = await buildSpreadsheets("biz1");
    expect(result.files.map((f) => f.path).sort()).toEqual([
      "Spreadsheets/customers.csv",
      "Spreadsheets/orders.csv",
      "Spreadsheets/products.csv",
    ]);
    for (const file of result.files) {
      expect(typeof file.contents).toBe("string");
      expect((file.contents as string).startsWith(CSV_BOM)).toBe(true);
    }
    expect(result.counts.orders).toBe(0);
    expect(result.counts.invoices).toBe(0);
    expect(result.counts["form-entries"]).toBe(0);
    expect(result.notes).toEqual([]);
  });

  it("emits a sheet once it has rows and writes one CSV per form with entries", async () => {
    formSubmissionFindMany.mockReset();
    formSubmissionFindMany.mockImplementation(
      ({ where }: { where: { formId: string } }) =>
        Promise.resolve(
          where.formId === "f1"
            ? [
                {
                  id: "s1",
                  submittedAt: new Date(Date.UTC(2026, 0, 5)),
                  status: "NEW",
                  tags: ["vip"],
                  answers: JSON.stringify([
                    {
                      fieldId: "x",
                      label: "Your name",
                      type: "text",
                      value: "Ann",
                    },
                  ]),
                },
              ]
            : [],
        ),
    );
    mockDb.current = makeDb({
      faqItem: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { question: "Q?", answer: "A.", sortOrder: 0, published: true },
          ]),
      },
      form: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "f1",
            name: "Contact us",
            definition: { version: 1, fields: [], settings: {} },
          },
          { id: "f2", name: "Empty form", definition: {} },
        ]),
      },
    });

    const result = await buildSpreadsheets("biz1");
    const paths = result.files.map((f) => f.path);
    expect(paths).toContain("Spreadsheets/faqs.csv");
    expect(paths).toContain("Spreadsheets/Form entries/Contact us.csv");
    expect(paths).not.toContain("Spreadsheets/Form entries/Empty form.csv");
    expect(result.counts.faqs).toBe(1);
    expect(result.counts["form-entries"]).toBe(1);

    const entries = result.files.find((f) => f.path.endsWith("Contact us.csv"));
    const text = entries?.contents as string;
    expect(text.startsWith(CSV_BOM)).toBe(true);
    expect(text).toContain("Your name");
    expect(text).toContain("Ann");
    expect(text).toContain("vip");
  });

  it("throws for an unknown business", async () => {
    mockDb.current = makeDb({
      business: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    await expect(buildSpreadsheets("nope")).rejects.toThrow(
      /Business not found/,
    );
  });
});

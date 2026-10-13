/**
 * "Download your site" export — data spreadsheets.
 *
 * `buildSpreadsheets(businessId)` reads everything a store owner would want to
 * open in Excel/Numbers and returns it as CSV files under `Spreadsheets/`,
 * plus per-sheet row counts and notes for the START HERE page.
 *
 * Reads go through `db` (decrypts the `@encrypted` columns). No HTTP, no
 * `next/headers`, no auth: the route handler owns those.
 */
import type { SiteExportFile, SiteExportNote } from "../types";
import type { Sheet } from "./format";
import type { ExistingItem } from "~/lib/inventory/csv";
import type { FormDefinition } from "~/lib/validators/form";
import { parseAnswersJson } from "~/lib/forms/answers";
import { buildFormCsv } from "~/lib/forms/csv";
import { buildInventoryCsv } from "~/lib/inventory/csv";
import { getOutstandingByItem } from "~/lib/inventory/rentals";
import { parseWeightTiers } from "~/lib/shipping-zone-config";
import {
  makeEmptyFormDefinition,
  parseStoredFormDefinition,
} from "~/lib/validators/form";
import { db } from "~/server/db";

import { createNameDeduper, safeName, SITE_EXPORT_DIRS } from "../types";
import { resolveTimeZone, sheetToCsv, withBom } from "./format";
import {
  collectionsSheet,
  customerAddressesSheet,
  customersSheet,
  discountsSheet,
  donationsSheet,
  emailSubscribersSheet,
  eventsSheet,
  faqsSheet,
  invoiceLineItemsSheet,
  invoicePaymentsSheet,
  invoicesSheet,
  loyaltyHistorySheet,
  loyaltyMembersSheet,
  orderItemsSheet,
  ordersSheet,
  productsSheet,
  quotesSheet,
  reviewsSheet,
  serviceItemsSheet,
  servicesSheet,
  shippingRatesSheet,
  subscriptionsSheet,
  testimonialsSheet,
} from "./sheets";

export interface SpreadsheetsResult {
  files: SiteExportFile[];
  /** Rows per sheet, keyed by a short slug ("orders", "form-entries", ...). */
  counts: Record<string, number>;
  notes: SiteExportNote[];
}

const DIR = SITE_EXPORT_DIRS.spreadsheets;
const FORM_ENTRIES_DIR = `${DIR}/Form entries`;
const FORM_BATCH_SIZE = 500;
const DEFAULT_INVOICE_PADDING = 4;

// ─── Pure helpers (exported for tests) ──────────────────────────────────────

/** Zip path for one form's entries: `Spreadsheets/Form entries/<name>.csv`. */
export function formEntriesPath(
  formName: string,
  dedupe: (name: string) => string,
): string {
  return `${FORM_ENTRIES_DIR}/${dedupe(safeName(formName, "Untitled form"))}.csv`;
}

/**
 * Turn the loaded inventory into the CSV the admin inventory page exports.
 * Re-exported seam so the BOM and header handling live in one place.
 */
export function inventoryCsv(items: ExistingItem[]): string {
  return withBom(buildInventoryCsv(items));
}

// ─── Collector ──────────────────────────────────────────────────────────────

class SheetCollector {
  readonly files: SiteExportFile[] = [];
  readonly counts: Record<string, number> = {};

  /**
   * Record a sheet's count; write the CSV when it has rows (or when
   * `alwaysEmit` — products/customers/orders keep a header-only file so the
   * owner sees the column layout).
   */
  add(slug: string, fileName: string, sheet: Sheet, alwaysEmit = false): void {
    this.counts[slug] = sheet.rows.length;
    if (sheet.rows.length === 0 && !alwaysEmit) return;
    this.files.push({
      path: `${DIR}/${fileName}`,
      contents: sheetToCsv(sheet),
    });
  }
}

export async function buildSpreadsheets(
  businessId: string,
): Promise<SpreadsheetsResult> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: {
      timeZone: true,
      shippingType: true,
      shippingFlatRate: true,
      freeShippingThreshold: true,
      shippingFallbackRate: true,
      shippingWeightTiers: true,
    },
  });
  if (!business) throw new Error(`Business not found: ${businessId}`);

  const ctx = { timeZone: resolveTimeZone(business.timeZone) };
  const notes: SiteExportNote[] = [];
  const out = new SheetCollector();

  const [
    products,
    collections,
    customers,
    orders,
    discounts,
    reviews,
    testimonials,
    faqs,
    invoices,
    invoiceSettings,
    quotes,
    loyaltyMembers,
    loyaltyLedger,
    subscriptions,
    donations,
    inventoryItems,
    subscribers,
    services,
    events,
    shippingZones,
  ] = await Promise.all([
    db.product.findMany({
      where: { businessId },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { createdAt: "asc" } },
        baseInventoryUnit: { select: { name: true } },
        optionGroups: {
          select: {
            sortOrder: true,
            group: { select: { name: true, adminLabel: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
        collectionProducts: {
          include: { collection: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.collection.findMany({
      where: { businessId },
      include: {
        collectionProducts: {
          select: { sortOrder: true, product: { select: { name: true } } },
        },
      },
    }),
    db.customer.findMany({
      where: { businessId },
      include: { shippingAddresses: true },
      orderBy: { createdAt: "desc" },
    }),
    db.order.findMany({
      where: { businessId },
      include: {
        items: true,
        shippingAddress: true,
        discountCode: { select: { code: true } },
        shipments: true,
      },
      orderBy: { orderNumber: "desc" },
    }),
    db.discountCode.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    }),
    db.productReview.findMany({
      where: { product: { businessId } },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { reviewDate: "desc" },
    }),
    db.testimonial.findMany({
      where: { businessId },
      orderBy: { testimonialDate: "desc" },
    }),
    db.faqItem.findMany({ where: { businessId } }),
    db.invoice.findMany({
      where: { businessId },
      include: { payments: true },
      orderBy: { invoiceNumber: "desc" },
    }),
    db.invoiceSettings.findUnique({
      where: { businessId },
      select: { numberPadding: true },
    }),
    db.quoteSubmission.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    }),
    db.customer.findMany({
      where: {
        businessId,
        OR: [
          { loyaltyJoinedAt: { not: null } },
          { loyaltyPoints: { not: 0 } },
          { loyaltyLedger: { some: {} } },
        ],
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        loyaltyPoints: true,
        loyaltyJoinedAt: true,
        birthMonth: true,
        birthDay: true,
        acceptsMarketing: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.loyaltyLedger.findMany({
      where: { businessId },
      include: {
        customer: { select: { email: true, firstName: true, lastName: true } },
        order: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.subscription.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    }),
    db.donation.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    }),
    loadInventoryItems(businessId),
    db.customer.findMany({
      where: {
        businessId,
        acceptsMarketing: true,
        anonymizedAt: null,
        NOT: { email: "" },
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        orderCount: true,
        totalSpent: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.service.findMany({
      where: { businessId },
      include: { items: true },
    }),
    db.event.findMany({ where: { businessId } }),
    db.shippingZone.findMany({
      where: { businessId },
      include: { rates: true },
    }),
  ]);

  const numberPadding =
    invoiceSettings?.numberPadding ?? DEFAULT_INVOICE_PADDING;
  const invoiceCtx = { ...ctx, numberPadding };

  // Catalog
  out.add("products", "products.csv", productsSheet(products, ctx), true);
  out.add("collections", "collections.csv", collectionsSheet(collections));

  // People
  out.add("customers", "customers.csv", customersSheet(customers, ctx), true);
  const addresses = customerAddressesSheet(customers);
  out.add("customer-addresses", "customer-addresses.csv", addresses);

  // Sales
  out.add("orders", "orders.csv", ordersSheet(orders, ctx), true);
  out.add("order-items", "order-items.csv", orderItemsSheet(orders, ctx));
  out.add("discounts", "discounts.csv", discountsSheet(discounts, ctx));
  out.add("reviews", "reviews.csv", reviewsSheet(reviews, ctx));
  out.add(
    "testimonials",
    "testimonials.csv",
    testimonialsSheet(testimonials, ctx),
  );
  out.add("faqs", "faqs.csv", faqsSheet(faqs));

  // Money records
  out.add("invoices", "invoices.csv", invoicesSheet(invoices, invoiceCtx));
  out.add(
    "invoice-line-items",
    "invoice-line-items.csv",
    invoiceLineItemsSheet(invoices, invoiceCtx),
  );
  out.add(
    "invoice-payments",
    "invoice-payments.csv",
    invoicePaymentsSheet(invoices, invoiceCtx),
  );
  out.add("quotes", "quotes.csv", quotesSheet(quotes, ctx));
  out.add(
    "subscriptions",
    "subscriptions.csv",
    subscriptionsSheet(subscriptions, ctx),
  );
  out.add("donations", "donations.csv", donationsSheet(donations, ctx));

  // Rewards
  out.add(
    "loyalty-members",
    "loyalty-members.csv",
    loyaltyMembersSheet(loyaltyMembers, ctx),
  );
  out.add(
    "loyalty-points-history",
    "loyalty-points-history.csv",
    loyaltyHistorySheet(loyaltyLedger, ctx),
  );

  // Inventory (shared builder with the admin inventory page)
  out.counts.inventory = inventoryItems.length;
  if (inventoryItems.length > 0) {
    out.files.push({
      path: `${DIR}/inventory.csv`,
      contents: inventoryCsv(inventoryItems),
    });
  }

  out.add(
    "email-subscribers",
    "email-subscribers.csv",
    emailSubscribersSheet(subscribers, ctx),
  );

  // Services, events, shipping
  out.add("services", "services.csv", servicesSheet(services));
  out.add(
    "service-offerings",
    "service-offerings.csv",
    serviceItemsSheet(services),
  );
  out.add("events", "events.csv", eventsSheet(events, ctx));
  out.add(
    "shipping-rates",
    "shipping-rates.csv",
    shippingRatesSheet({
      shippingType: business.shippingType,
      shippingFlatRate: business.shippingFlatRate,
      freeShippingThreshold: business.freeShippingThreshold,
      shippingFallbackRate: business.shippingFallbackRate,
      weightTiers: parseWeightTiers(business.shippingWeightTiers),
      zones: shippingZones,
    }),
  );

  // Form entries: one CSV per form that has entries.
  const formResult = await buildFormEntryFiles(businessId);
  out.files.push(...formResult.files);
  out.counts["form-entries"] = formResult.totalEntries;
  notes.push(...formResult.notes);

  return { files: out.files, counts: out.counts, notes };
}

// ─── Inventory ──────────────────────────────────────────────────────────────

/** Same shape the admin inventory page exports (see base-inventory-unit.ts). */
async function loadInventoryItems(businessId: string): Promise<ExistingItem[]> {
  const [items, outstanding] = await Promise.all([
    db.baseInventoryUnit.findMany({
      where: { businessId },
      select: {
        id: true,
        name: true,
        sku: true,
        itemType: true,
        category: true,
        storageLocation: true,
        description: true,
        inventoryQty: true,
        reservedQty: true,
        lowInventoryThreshold: true,
        unitCostCents: true,
        _count: { select: { products: true } },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    getOutstandingByItem(db, businessId),
  ]);
  return items.map(({ _count, ...item }) => ({
    ...item,
    outstanding: outstanding.get(item.id) ?? 0,
    linkedProducts: _count.products,
  }));
}

// ─── Form entries ───────────────────────────────────────────────────────────

async function buildFormEntryFiles(businessId: string): Promise<{
  files: SiteExportFile[];
  totalEntries: number;
  notes: SiteExportNote[];
}> {
  const files: SiteExportFile[] = [];
  const notes: SiteExportNote[] = [];
  let totalEntries = 0;
  const dedupe = createNameDeduper();

  const forms = await db.form.findMany({
    where: { businessId },
    select: { id: true, name: true, definition: true },
    orderBy: { createdAt: "asc" },
  });

  for (const form of forms) {
    const submissions = await loadFormSubmissions(businessId, form.id);
    if (submissions.length === 0) continue;

    let definition: FormDefinition;
    const parsed = parseStoredFormDefinition(form.definition);
    if (parsed.success) {
      definition = parsed.data;
    } else {
      // Every saved answer still carries its label, so an empty definition
      // yields a usable sheet (all columns come from the entries themselves).
      definition = makeEmptyFormDefinition();
      notes.push({
        level: "warn",
        message: `The layout of the form "${form.name}" could not be read, so its entries sheet takes its columns from the saved answers instead.`,
      });
    }

    const csv = buildFormCsv(
      definition,
      submissions.map((s) => ({
        submittedAt: s.submittedAt,
        status: s.status,
        tags: s.tags,
        answers: parseAnswersJson(s.answers),
      })),
    );
    files.push({
      path: formEntriesPath(form.name, dedupe),
      contents: withBom(csv),
    });
    totalEntries += submissions.length;
  }

  return { files, totalEntries, notes };
}

/** Every entry of one form, newest first, read in id-cursor batches. */
async function loadFormSubmissions(businessId: string, formId: string) {
  const all: Array<{
    submittedAt: Date;
    status: string;
    tags: string[];
    answers: string | null;
  }> = [];
  let cursor: string | null = null;
  for (;;) {
    const batch: Array<{
      id: string;
      submittedAt: Date;
      status: string;
      tags: string[];
      answers: string | null;
    }> = await db.formSubmission.findMany({
      where: { businessId, formId, ...(cursor ? { id: { gt: cursor } } : {}) },
      select: {
        id: true,
        submittedAt: true,
        status: true,
        tags: true,
        answers: true,
      },
      orderBy: { id: "asc" },
      take: FORM_BATCH_SIZE,
    });
    if (batch.length === 0) break;
    all.push(...batch);
    cursor = batch[batch.length - 1]?.id ?? null;
    if (batch.length < FORM_BATCH_SIZE) break;
  }
  return all.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

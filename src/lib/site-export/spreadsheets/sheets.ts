/**
 * "Download your site" export — pure row mappers.
 *
 * Each `*Sheet` function takes plain, already-decrypted records (structurally
 * typed, so Prisma rows satisfy them and tests need no database) and returns a
 * `Sheet`: an ordered list of friendly column headers plus rows. `build.ts`
 * loads the data; `format.ts` turns a sheet into CSV text.
 *
 * Conventions: money is dollars as a decimal ("12.34"), instants are
 * "YYYY-MM-DD HH:mm" in the store's time zone, calendar dates are
 * "YYYY-MM-DD", booleans are "Yes"/"No".
 */
import type { Row, Sheet } from "./format";
import { orderItemOptionLines } from "~/lib/customizer/display";
import { marketingConsentSourceLabel } from "~/lib/marketing/consent";

import {
  centsToMoney,
  formatBirthday,
  formatCalendarDate,
  formatDateInZone,
  formatDateTime,
  humanize,
  joinParts,
  orBlank,
  plainText,
  yesNo,
} from "./format";

export interface SheetContext {
  /** IANA zone used for every instant. */
  timeZone: string;
}

const LIST_SEPARATOR = " | ";

function sheet<const C extends readonly string[]>(
  columns: C,
  rows: Array<Record<C[number], string | number>>,
): Sheet {
  return { columns, rows: rows as Row[] };
}

// ─── Products ───────────────────────────────────────────────────────────────

export interface ProductSheetVariant {
  name: string;
  sku: string | null;
  barcode: string | null;
  /** Cents; null = same as the product. */
  price: number | null;
  compareAtPrice: number | null;
  inventoryQty: number;
  /** `{ size: "Small", color: "Red" }` */
  options: unknown;
  imageUrl: string | null;
}

export interface ProductSheetProduct {
  name: string;
  slug: string;
  excerpt: string | null;
  description: string | null;
  /** Cents. */
  price: number;
  compareAtPrice: number | null;
  cost: number | null;
  sku: string | null;
  barcode: string | null;
  trackInventory: boolean;
  inventoryQty: number;
  allowBackorders: boolean;
  weight: number | null;
  weightUnit: string | null;
  published: boolean;
  scheduledPublishAt: Date | null;
  featured: boolean;
  subscriptionEnabled: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date;
  baseInventoryUnit: { name: string } | null;
  images: Array<{ url: string; sortOrder: number }>;
  variants: ProductSheetVariant[];
  collectionProducts: Array<{ collection: { name: string } }>;
  /** Product customizer groups attached to this product (optional: absent = none). */
  optionGroups?: Array<{
    sortOrder: number;
    group: { name: string; adminLabel: string | null };
  }>;
}

export const PRODUCT_COLUMNS = [
  "Product name",
  "Web address ending (slug)",
  "Status",
  "Featured",
  "Variant",
  "Options",
  "Price",
  "Compare-at price",
  "Cost",
  "SKU",
  "Barcode",
  "Stock",
  "Allow backorders",
  "Shared inventory item",
  "Weight",
  "Weight unit",
  "Collections",
  "Option groups",
  "Short description",
  "Description",
  "Image URLs",
  "Variant image URL",
  "Subscribe & save",
  "Search title (SEO)",
  "Search description (SEO)",
  "Created",
] as const;

/** `{ size: "Small", color: "Red" }` → "size: Small; color: Red". */
export function formatOptions(options: unknown): string {
  if (
    options == null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    return "";
  }
  return Object.entries(options as Record<string, unknown>)
    .flatMap(([key, value]) =>
      (typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean") &&
      String(value).trim() !== ""
        ? [`${key}: ${String(value)}`]
        : [],
    )
    .join("; ");
}

function productStatus(product: ProductSheetProduct): string {
  if (product.published) return "Published";
  return product.scheduledPublishAt ? "Scheduled" : "Draft";
}

/**
 * One row per variant, or one row for a product with no variants. Product
 * columns repeat on every variant row so the sheet sorts and filters cleanly;
 * the bulky Short description / Description / Image URLs / Collections cells
 * appear on a product's first row only.
 */
export function productsSheet(
  products: ProductSheetProduct[],
  ctx: SheetContext,
): Sheet {
  const rows: Row[] = [];

  for (const product of products) {
    const tracked = product.trackInventory && !product.baseInventoryUnit;
    const images = [...product.images]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((image) => image.url)
      .join(LIST_SEPARATOR);
    const collections = product.collectionProducts
      .map((cp) => cp.collection.name)
      .join("; ");

    // Customizer groups (charms, engraving, ...). "Name (internal label)"
    // when the owner gave the group an admin label.
    const optionGroups = [...(product.optionGroups ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ group }) =>
        group.adminLabel ? `${group.name} (${group.adminLabel})` : group.name,
      )
      .join("; ");

    const shared = {
      "Product name": product.name,
      "Web address ending (slug)": product.slug,
      Status: productStatus(product),
      Featured: yesNo(product.featured),
      Cost: centsToMoney(product.cost),
      "Allow backorders": yesNo(product.allowBackorders),
      "Shared inventory item": product.baseInventoryUnit?.name ?? "",
      Weight: orBlank(product.weight),
      "Weight unit": product.weight != null ? (product.weightUnit ?? "") : "",
      "Subscribe & save": yesNo(product.subscriptionEnabled),
      "Search title (SEO)": product.metaTitle ?? "",
      "Search description (SEO)": product.metaDescription ?? "",
      Created: formatDateTime(product.createdAt, ctx.timeZone),
    };
    const heavy = {
      "Short description": plainText(product.excerpt),
      Description: plainText(product.description),
      "Image URLs": images,
      Collections: collections,
      "Option groups": optionGroups,
    };
    const blankHeavy = {
      "Short description": "",
      Description: "",
      "Image URLs": "",
      Collections: "",
      "Option groups": "",
    };

    if (product.variants.length === 0) {
      rows.push({
        ...shared,
        ...heavy,
        Variant: "",
        Options: "",
        Price: centsToMoney(product.price),
        "Compare-at price": centsToMoney(product.compareAtPrice),
        SKU: product.sku ?? "",
        Barcode: product.barcode ?? "",
        Stock: tracked ? product.inventoryQty : "",
        "Variant image URL": "",
      });
      continue;
    }

    product.variants.forEach((variant, index) => {
      const ownPrice = variant.price != null;
      rows.push({
        ...shared,
        ...(index === 0 ? heavy : blankHeavy),
        Variant: variant.name,
        Options: formatOptions(variant.options),
        Price: centsToMoney(variant.price ?? product.price),
        "Compare-at price": centsToMoney(
          variant.compareAtPrice ?? (ownPrice ? null : product.compareAtPrice),
        ),
        SKU: variant.sku ?? "",
        Barcode: variant.barcode ?? "",
        Stock: tracked ? variant.inventoryQty : "",
        "Variant image URL": variant.imageUrl ?? "",
      });
    });
  }

  return { columns: PRODUCT_COLUMNS, rows };
}

// ─── Collections ────────────────────────────────────────────────────────────

export interface CollectionSheetCollection {
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  published: boolean;
  sortOrder: number;
  metaTitle: string | null;
  metaDescription: string | null;
  collectionProducts: Array<{ sortOrder: number; product: { name: string } }>;
}

export const COLLECTION_COLUMNS = [
  "Collection name",
  "Web address ending (slug)",
  "Status",
  "Description",
  "Image URL",
  "Number of products",
  "Products",
  "Search title (SEO)",
  "Search description (SEO)",
] as const;

export function collectionsSheet(
  collections: CollectionSheetCollection[],
): Sheet {
  return sheet(
    COLLECTION_COLUMNS,
    [...collections]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({
        "Collection name": c.name,
        "Web address ending (slug)": c.slug,
        Status: c.published ? "Published" : "Draft",
        Description: plainText(c.description),
        "Image URL": c.imageUrl ?? "",
        "Number of products": c.collectionProducts.length,
        Products: [...c.collectionProducts]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((cp) => cp.product.name)
          .join("; "),
        "Search title (SEO)": c.metaTitle ?? "",
        "Search description (SEO)": c.metaDescription ?? "",
      })),
  );
}

// ─── Customers ──────────────────────────────────────────────────────────────

export interface CustomerSheetAddress {
  firstName: string;
  lastName: string;
  company: string | null;
  address1: string;
  address2: string | null;
  city: string;
  province: string | null;
  zip: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

export interface CustomerSheetCustomer {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  acceptsMarketing: boolean;
  /** Cents. */
  totalSpent: number;
  orderCount: number;
  notes: string | null;
  createdAt: Date;
  /** Linked login (an account) vs. a guest checkout / imported contact. */
  userId: string | null;
  loyaltyPoints: number;
  loyaltyJoinedAt: Date | null;
  birthMonth: number | null;
  birthDay: number | null;
  anonymizedAt: Date | null;
  deletionRequestedAt: Date | null;
  shippingAddresses: CustomerSheetAddress[];
}

export const CUSTOMER_COLUMNS = [
  "Email",
  "First name",
  "Last name",
  "Phone",
  "Accepts marketing emails",
  "Total spent",
  "Number of orders",
  "Has an online account",
  "Rewards member",
  "Rewards points",
  "Notes",
  "Customer since",
  "Deletion requested",
  "Personal details removed",
] as const;

export function customersSheet(
  customers: CustomerSheetCustomer[],
  ctx: SheetContext,
): Sheet {
  return sheet(
    CUSTOMER_COLUMNS,
    customers.map((c) => ({
      Email: c.email,
      "First name": c.firstName ?? "",
      "Last name": c.lastName ?? "",
      Phone: c.phone ?? "",
      "Accepts marketing emails": yesNo(c.acceptsMarketing),
      "Total spent": centsToMoney(c.totalSpent),
      "Number of orders": c.orderCount,
      "Has an online account": yesNo(c.userId != null),
      "Rewards member": yesNo(c.loyaltyJoinedAt != null),
      "Rewards points": c.loyaltyPoints,
      Notes: c.notes ?? "",
      "Customer since": formatDateTime(c.createdAt, ctx.timeZone),
      "Deletion requested": formatDateTime(c.deletionRequestedAt, ctx.timeZone),
      "Personal details removed": formatDateTime(c.anonymizedAt, ctx.timeZone),
    })),
  );
}

export const CUSTOMER_ADDRESS_COLUMNS = [
  "Customer email",
  "First name",
  "Last name",
  "Company",
  "Address line 1",
  "Address line 2",
  "City",
  "State / province",
  "ZIP / postal code",
  "Country",
  "Phone",
  "Default address",
] as const;

export function customerAddressesSheet(
  customers: CustomerSheetCustomer[],
): Sheet {
  return sheet(
    CUSTOMER_ADDRESS_COLUMNS,
    customers.flatMap((c) =>
      c.shippingAddresses.map((a) => ({
        "Customer email": c.email,
        "First name": a.firstName,
        "Last name": a.lastName,
        Company: a.company ?? "",
        "Address line 1": a.address1,
        "Address line 2": a.address2 ?? "",
        City: a.city,
        "State / province": a.province ?? "",
        "ZIP / postal code": a.zip,
        Country: a.country,
        Phone: a.phone ?? "",
        "Default address": yesNo(a.isDefault),
      })),
    ),
  );
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export interface OrderSheetItem {
  productName: string;
  variantName: string | null;
  sku: string | null;
  /** Cents. */
  price: number;
  quantity: number;
  /** Cents. */
  total: number;
  fulfilledQuantity: number;
  /** Product-customizer snapshot JSON (optional: absent/null = plain line). */
  customization?: unknown;
}

export interface OrderSheetOrder {
  orderNumber: number;
  createdAt: Date;
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  deliveryMethod: string;
  paymentMethod: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  refundAmountCents: number | null;
  refundReason: string | null;
  customerNote: string | null;
  internalNote: string | null;
  stripePaymentIntentId: string | null;
  discountCode: { code: string } | null;
  items: OrderSheetItem[];
  shippingAddress: {
    firstName: string;
    lastName: string;
    address1: string;
    address2: string | null;
    city: string;
    province: string | null;
    zip: string;
    country: string;
  } | null;
  shipments: Array<{
    carrier: string | null;
    trackingNumber: string | null;
  }>;
}

export const ORDER_COLUMNS = [
  "Order number",
  "Order date",
  "Customer name",
  "Customer email",
  "Customer phone",
  "Order status",
  "Payment status",
  "Fulfillment status",
  "Delivery method",
  "Payment method",
  "Items subtotal",
  "Shipping",
  "Tax",
  "Discount",
  "Total",
  "Refunded",
  "Refund reason",
  "Discount code",
  "Number of items",
  "Items",
  "Ship to name",
  "Ship to address",
  "Ship to city",
  "Ship to state / province",
  "Ship to ZIP / postal code",
  "Ship to country",
  "Tracking",
  "Customer note",
  "Your private note",
  "Stripe payment ID",
] as const;

export function ordersSheet(
  orders: OrderSheetOrder[],
  ctx: SheetContext,
): Sheet {
  return sheet(
    ORDER_COLUMNS,
    orders.map((o) => ({
      "Order number": o.orderNumber,
      "Order date": formatDateTime(o.createdAt, ctx.timeZone),
      "Customer name": o.customerName ?? "",
      "Customer email": o.customerEmail,
      "Customer phone": o.customerPhone ?? "",
      "Order status": humanize(o.status),
      "Payment status": humanize(o.paymentStatus),
      "Fulfillment status": humanize(o.fulfillmentStatus),
      "Delivery method": humanize(o.deliveryMethod),
      "Payment method": humanize(o.paymentMethod),
      "Items subtotal": centsToMoney(o.subtotal),
      Shipping: centsToMoney(o.shipping),
      Tax: centsToMoney(o.tax),
      Discount: centsToMoney(o.discount),
      Total: centsToMoney(o.total),
      Refunded: centsToMoney(o.refundAmountCents ?? 0),
      "Refund reason": o.refundReason ?? "",
      "Discount code": o.discountCode?.code ?? "",
      "Number of items": o.items.reduce((sum, i) => sum + i.quantity, 0),
      Items: o.items
        .map(
          (i) =>
            `${i.quantity} x ${i.productName}${i.variantName ? ` (${i.variantName})` : ""}`,
        )
        .join("; "),
      "Ship to name": o.shippingAddress
        ? joinParts(
            [o.shippingAddress.firstName, o.shippingAddress.lastName],
            " ",
          )
        : "",
      "Ship to address": o.shippingAddress
        ? joinParts(
            [o.shippingAddress.address1, o.shippingAddress.address2],
            ", ",
          )
        : "",
      "Ship to city": o.shippingAddress?.city ?? "",
      "Ship to state / province": o.shippingAddress?.province ?? "",
      "Ship to ZIP / postal code": o.shippingAddress?.zip ?? "",
      "Ship to country": o.shippingAddress?.country ?? "",
      Tracking: o.shipments
        .map((s) => joinParts([s.carrier, s.trackingNumber], " "))
        .filter((t) => t !== "")
        .join("; "),
      "Customer note": o.customerNote ?? "",
      "Your private note": o.internalNote ?? "",
      "Stripe payment ID": o.stripePaymentIntentId ?? "",
    })),
  );
}

export const ORDER_ITEM_COLUMNS = [
  "Order number",
  "Order date",
  "Product",
  "Variant",
  "Options",
  "SKU",
  "Unit price",
  "Quantity",
  "Line total",
  "Quantity shipped",
] as const;

export function orderItemsSheet(
  orders: OrderSheetOrder[],
  ctx: SheetContext,
): Sheet {
  return sheet(
    ORDER_ITEM_COLUMNS,
    orders.flatMap((o) =>
      o.items.map((item) => ({
        "Order number": o.orderNumber,
        "Order date": formatDateTime(o.createdAt, ctx.timeZone),
        Product: item.productName,
        Variant: item.variantName ?? "",
        // Product-customizer choices as "Charms: Star, Moon; Engraving: “AB”".
        Options: orderItemOptionLines(item.customization)
          .map((line) => `${line.label}: ${line.value}`)
          .join("; "),
        SKU: item.sku ?? "",
        "Unit price": centsToMoney(item.price),
        Quantity: item.quantity,
        "Line total": centsToMoney(item.total),
        "Quantity shipped": item.fulfilledQuantity,
      })),
    ),
  );
}

// ─── Discounts ──────────────────────────────────────────────────────────────

export interface DiscountSheetDiscount {
  code: string;
  /** "percentage" | "fixed" */
  type: string;
  /** Whole percent, or cents for "fixed". */
  value: number;
  active: boolean;
  source: string;
  usageLimit: number | null;
  usageCount: number;
  perCustomerLimit: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  minPurchase: number | null;
  maxDiscount: number | null;
}

export const DISCOUNT_COLUMNS = [
  "Code",
  "Type",
  "Amount off",
  "Active",
  "Created by",
  "Total uses allowed",
  "Times used",
  "Uses allowed per customer",
  "Starts",
  "Expires",
  "Minimum purchase",
  "Maximum discount",
] as const;

export function discountsSheet(
  discounts: DiscountSheetDiscount[],
  ctx: SheetContext,
): Sheet {
  return sheet(
    DISCOUNT_COLUMNS,
    discounts.map((d) => ({
      Code: d.code,
      Type: d.type === "percentage" ? "Percent off" : "Dollar amount off",
      "Amount off":
        d.type === "percentage" ? `${d.value}%` : centsToMoney(d.value),
      Active: yesNo(d.active),
      "Created by": d.source === "loyalty" ? "Rewards redemption" : "You",
      "Total uses allowed": d.usageLimit ?? "Unlimited",
      "Times used": d.usageCount,
      "Uses allowed per customer": d.perCustomerLimit ?? "Unlimited",
      Starts: formatDateTime(d.startsAt, ctx.timeZone),
      Expires: formatDateTime(d.expiresAt, ctx.timeZone),
      "Minimum purchase": centsToMoney(d.minPurchase),
      "Maximum discount": centsToMoney(d.maxDiscount),
    })),
  );
}

// ─── Reviews / testimonials / FAQs ──────────────────────────────────────────

export interface ReviewSheetReview {
  product: { name: string; sku: string | null };
  rating: number;
  title: string | null;
  comment: string;
  customerName: string;
  customerEmail: string | null;
  verifiedPurchase: boolean;
  isApproved: boolean;
  isHidden: boolean;
  source: string;
  reviewDate: Date;
  images: string[];
  videoUrl: string | null;
}

export function moderationStatus(item: {
  isApproved: boolean;
  isHidden: boolean;
}): string {
  if (item.isHidden) return "Hidden";
  return item.isApproved ? "Published" : "Waiting for approval";
}

export const REVIEW_COLUMNS = [
  "Product",
  "Product SKU",
  "Rating (1-5)",
  "Review title",
  "Review",
  "Reviewer name",
  "Reviewer email",
  "Verified purchase",
  "Status",
  "Written by",
  "Review date",
  "Photo URLs",
  "Video URL",
] as const;

export function reviewsSheet(
  reviews: ReviewSheetReview[],
  ctx: SheetContext,
): Sheet {
  return sheet(
    REVIEW_COLUMNS,
    reviews.map((r) => ({
      Product: r.product.name,
      "Product SKU": r.product.sku ?? "",
      "Rating (1-5)": r.rating,
      "Review title": r.title ?? "",
      Review: r.comment,
      "Reviewer name": r.customerName,
      "Reviewer email": r.customerEmail ?? "",
      "Verified purchase": yesNo(r.verifiedPurchase),
      Status: moderationStatus(r),
      "Written by": r.source === "owner" ? "You" : "Customer",
      "Review date": formatDateTime(r.reviewDate, ctx.timeZone),
      "Photo URLs": r.images.join(LIST_SEPARATOR),
      "Video URL": r.videoUrl ?? "",
    })),
  );
}

export interface TestimonialSheetTestimonial {
  title: string | null;
  text: string;
  photoUrls: string[];
  isApproved: boolean;
  isHidden: boolean;
  source: string;
  customerName: string;
  customerEmail: string | null;
  customerTitle: string | null;
  customerCompany: string | null;
  testimonialDate: Date;
}

export const TESTIMONIAL_COLUMNS = [
  "Name",
  "Job title",
  "Company",
  "Email",
  "Headline",
  "Testimonial",
  "Status",
  "Written by",
  "Date",
  "Photo URLs",
] as const;

export function testimonialsSheet(
  testimonials: TestimonialSheetTestimonial[],
  ctx: SheetContext,
): Sheet {
  return sheet(
    TESTIMONIAL_COLUMNS,
    testimonials.map((t) => ({
      Name: t.customerName,
      "Job title": t.customerTitle ?? "",
      Company: t.customerCompany ?? "",
      Email: t.customerEmail ?? "",
      Headline: t.title ?? "",
      Testimonial: t.text,
      Status: moderationStatus(t),
      "Written by": t.source === "owner" ? "You" : "Customer",
      Date: formatDateInZone(t.testimonialDate, ctx.timeZone),
      "Photo URLs": t.photoUrls.join(LIST_SEPARATOR),
    })),
  );
}

export interface FaqSheetItem {
  question: string;
  answer: string;
  sortOrder: number;
  published: boolean;
}

export const FAQ_COLUMNS = ["Question", "Answer", "Shown on site"] as const;

export function faqsSheet(items: FaqSheetItem[]): Sheet {
  return sheet(
    FAQ_COLUMNS,
    [...items]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((f) => ({
        Question: f.question,
        Answer: plainText(f.answer),
        "Shown on site": yesNo(f.published),
      })),
  );
}

// ─── Invoices ───────────────────────────────────────────────────────────────

export interface InvoiceSheetPayment {
  amountCents: number;
  /** Calendar date at UTC midnight. */
  paidOn: Date;
  method: string;
  reference: string | null;
  note: string | null;
  createdAt: Date;
}

export interface InvoiceSheetInvoice {
  invoiceNumber: number;
  numberPrefix: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  /** JSON `{line1,line2?,city,state,zip}` */
  billingAddress: string | null;
  currency: string;
  /** JSON `InvoiceLineItem[]` */
  lineItems: string;
  subtotalCents: number;
  discountCents: number;
  taxRateBps: number;
  taxCents: number;
  totalCents: number;
  amountPaidCents: number;
  issueDate: Date | null;
  dueDate: Date | null;
  notes: string | null;
  terms: string | null;
  sentAt: Date | null;
  paidAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  payments: InvoiceSheetPayment[];
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

const INVOICE_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank transfer",
  paypal: "PayPal",
  venmo: "Venmo",
  cash_app: "Cash App",
  zelle: "Zelle",
  cash_check: "Cash or check",
  other: "Other",
  card: "Card",
};

/** "INV-" + 12 with padding 4 → "INV-0012". */
export function formatInvoiceLabel(
  invoice: Pick<InvoiceSheetInvoice, "invoiceNumber" | "numberPrefix">,
  padding: number,
): string {
  const width = Math.max(1, Math.floor(padding));
  return `${invoice.numberPrefix}${String(invoice.invoiceNumber).padStart(width, "0")}`;
}

/** Parse the stored billing-address JSON into one line; never throws. */
export function formatBillingAddress(json: string | null): string {
  if (!json) return "";
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed == null || typeof parsed !== "object") return "";
    const a = parsed as Record<string, unknown>;
    const str = (key: string) => (typeof a[key] === "string" ? a[key] : "");
    return joinParts(
      [
        str("line1"),
        str("line2"),
        str("city"),
        joinParts([str("state"), str("zip")], " "),
      ],
      ", ",
    );
  } catch {
    return "";
  }
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

/** Tolerant read of the stored line-items JSON (bad entries dropped). */
export function parseInvoiceLines(json: string | null): InvoiceLine[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    const lines: InvoiceLine[] = [];
    for (const entry of parsed) {
      if (entry == null || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      if (
        typeof e.description === "string" &&
        typeof e.quantity === "number" &&
        typeof e.unitPriceCents === "number"
      ) {
        lines.push({
          description: e.description,
          quantity: e.quantity,
          unitPriceCents: e.unitPriceCents,
        });
      }
    }
    return lines;
  } catch {
    return [];
  }
}

/** Same rounding as the invoice totals (`computeLineAmountCents`). */
function lineAmountCents(quantity: number, unitPriceCents: number): number {
  return Math.round((Math.round(quantity * 1000) * unitPriceCents) / 1000);
}

export const INVOICE_COLUMNS = [
  "Invoice number",
  "Status",
  "Customer name",
  "Customer email",
  "Customer phone",
  "Billing address",
  "Issue date",
  "Due date",
  "Subtotal",
  "Discount",
  "Tax rate (%)",
  "Tax",
  "Total",
  "Amount paid",
  "Balance due",
  "Currency",
  "Sent on",
  "Paid on",
  "Cancelled on",
  "Cancel reason",
  "Notes",
  "Terms",
  "Created",
] as const;

export function invoicesSheet(
  invoices: InvoiceSheetInvoice[],
  ctx: SheetContext & { numberPadding: number },
): Sheet {
  return sheet(
    INVOICE_COLUMNS,
    invoices.map((i) => ({
      "Invoice number": formatInvoiceLabel(i, ctx.numberPadding),
      Status: INVOICE_STATUS_LABELS[i.status] ?? humanize(i.status),
      "Customer name": i.customerName,
      "Customer email": i.customerEmail,
      "Customer phone": i.customerPhone ?? "",
      "Billing address": formatBillingAddress(i.billingAddress),
      "Issue date": formatCalendarDate(i.issueDate),
      "Due date": formatCalendarDate(i.dueDate),
      Subtotal: centsToMoney(i.subtotalCents),
      Discount: centsToMoney(i.discountCents),
      "Tax rate (%)": i.taxRateBps === 0 ? "" : String(i.taxRateBps / 100),
      Tax: centsToMoney(i.taxCents),
      Total: centsToMoney(i.totalCents),
      "Amount paid": centsToMoney(i.amountPaidCents),
      "Balance due": centsToMoney(
        Math.max(0, i.totalCents - i.amountPaidCents),
      ),
      Currency: i.currency.toUpperCase(),
      "Sent on": formatDateTime(i.sentAt, ctx.timeZone),
      "Paid on": formatDateTime(i.paidAt, ctx.timeZone),
      "Cancelled on": formatDateTime(i.cancelledAt, ctx.timeZone),
      "Cancel reason": i.cancelReason ?? "",
      Notes: i.notes ?? "",
      Terms: i.terms ?? "",
      Created: formatDateTime(i.createdAt, ctx.timeZone),
    })),
  );
}

export const INVOICE_LINE_COLUMNS = [
  "Invoice number",
  "Description",
  "Quantity",
  "Unit price",
  "Line total",
] as const;

export function invoiceLineItemsSheet(
  invoices: InvoiceSheetInvoice[],
  ctx: { numberPadding: number },
): Sheet {
  return sheet(
    INVOICE_LINE_COLUMNS,
    invoices.flatMap((i) =>
      parseInvoiceLines(i.lineItems).map((line) => ({
        "Invoice number": formatInvoiceLabel(i, ctx.numberPadding),
        Description: line.description,
        Quantity: line.quantity,
        "Unit price": centsToMoney(line.unitPriceCents),
        "Line total": centsToMoney(
          lineAmountCents(line.quantity, line.unitPriceCents),
        ),
      })),
    ),
  );
}

export const INVOICE_PAYMENT_COLUMNS = [
  "Invoice number",
  "Customer name",
  "Date paid",
  "Amount",
  "Method",
  "Reference",
  "Note",
  "Recorded on",
] as const;

export function invoicePaymentsSheet(
  invoices: InvoiceSheetInvoice[],
  ctx: SheetContext & { numberPadding: number },
): Sheet {
  return sheet(
    INVOICE_PAYMENT_COLUMNS,
    invoices.flatMap((i) =>
      [...i.payments]
        .sort((a, b) => a.paidOn.getTime() - b.paidOn.getTime())
        .map((p) => ({
          "Invoice number": formatInvoiceLabel(i, ctx.numberPadding),
          "Customer name": i.customerName,
          "Date paid": formatCalendarDate(p.paidOn),
          Amount: centsToMoney(p.amountCents),
          Method: INVOICE_METHOD_LABELS[p.method] ?? humanize(p.method),
          Reference: p.reference ?? "",
          Note: p.note ?? "",
          "Recorded on": formatDateTime(p.createdAt, ctx.timeZone),
        })),
    ),
  );
}

// ─── Quotes ─────────────────────────────────────────────────────────────────

export interface QuoteSheetSubmission {
  createdAt: Date;
  status: string;
  calculatorName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  /** `[{ title, display, hidden, ... }]` */
  answers: unknown;
  estimateCents: number | null;
  finalQuoteCents: number | null;
  quoteSentAt: Date | null;
  sentQuoteCents: number | null;
}

/** Visible answers as "Question: answer" lines. */
export function formatQuoteAnswers(answers: unknown): string {
  if (!Array.isArray(answers)) return "";
  const lines: string[] = [];
  for (const entry of answers) {
    if (entry == null || typeof entry !== "object") continue;
    const a = entry as Record<string, unknown>;
    if (a.hidden === true) continue;
    if (typeof a.title !== "string") continue;
    const display = typeof a.display === "string" ? a.display : "";
    lines.push(`${a.title}: ${display}`);
  }
  return lines.join("\n");
}

export const QUOTE_COLUMNS = [
  "Received",
  "Status",
  "Calculator",
  "Name",
  "Email",
  "Phone",
  "Automatic estimate",
  "Your final quote",
  "Quote emailed on",
  "Amount emailed",
  "Their answers",
] as const;

export function quotesSheet(
  quotes: QuoteSheetSubmission[],
  ctx: SheetContext,
): Sheet {
  return sheet(
    QUOTE_COLUMNS,
    quotes.map((q) => ({
      Received: formatDateTime(q.createdAt, ctx.timeZone),
      Status: humanize(q.status),
      Calculator: q.calculatorName,
      Name: q.contactName,
      Email: q.contactEmail,
      Phone: q.contactPhone ?? "",
      "Automatic estimate": centsToMoney(q.estimateCents),
      "Your final quote": centsToMoney(q.finalQuoteCents),
      "Quote emailed on": formatDateTime(q.quoteSentAt, ctx.timeZone),
      "Amount emailed": centsToMoney(q.sentQuoteCents),
      "Their answers": formatQuoteAnswers(q.answers),
    })),
  );
}

// ─── Rewards ────────────────────────────────────────────────────────────────

export const LOYALTY_MEMBER_COLUMNS = [
  "Email",
  "First name",
  "Last name",
  "Points balance",
  "Joined rewards",
  "Birthday",
  "Accepts marketing emails",
] as const;

export type LoyaltyMemberRow = Pick<
  CustomerSheetCustomer,
  | "email"
  | "firstName"
  | "lastName"
  | "loyaltyPoints"
  | "loyaltyJoinedAt"
  | "birthMonth"
  | "birthDay"
  | "acceptsMarketing"
>;

export function loyaltyMembersSheet(
  members: LoyaltyMemberRow[],
  ctx: SheetContext,
): Sheet {
  return sheet(
    LOYALTY_MEMBER_COLUMNS,
    members.map((c) => ({
      Email: c.email,
      "First name": c.firstName ?? "",
      "Last name": c.lastName ?? "",
      "Points balance": c.loyaltyPoints,
      "Joined rewards": formatDateInZone(c.loyaltyJoinedAt, ctx.timeZone),
      Birthday: formatBirthday(c.birthMonth, c.birthDay),
      "Accepts marketing emails": yesNo(c.acceptsMarketing),
    })),
  );
}

export interface LoyaltyLedgerSheetRow {
  createdAt: Date;
  type: string;
  points: number;
  balanceAfter: number;
  reason: string | null;
  customer: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  order: { orderNumber: number } | null;
}

const LOYALTY_TYPE_LABELS: Record<string, string> = {
  order_earn: "Earned on an order",
  first_order_bonus: "First-order bonus",
  signup_bonus: "Sign-up bonus",
  birthday_bonus: "Birthday bonus",
  social_follow: "Social follow bonus",
  order_clawback: "Removed (refund or cancellation)",
  redeem: "Reward redeemed",
  adjust: "Adjusted by you",
};

export const LOYALTY_HISTORY_COLUMNS = [
  "Date",
  "Customer email",
  "Customer name",
  "What happened",
  "Points",
  "Balance after",
  "Order number",
  "Note",
] as const;

export function loyaltyHistorySheet(
  rows: LoyaltyLedgerSheetRow[],
  ctx: SheetContext,
): Sheet {
  return sheet(
    LOYALTY_HISTORY_COLUMNS,
    rows.map((r) => ({
      Date: formatDateTime(r.createdAt, ctx.timeZone),
      "Customer email": r.customer.email,
      "Customer name": joinParts(
        [r.customer.firstName, r.customer.lastName],
        " ",
      ),
      "What happened": LOYALTY_TYPE_LABELS[r.type] ?? humanize(r.type),
      Points: r.points,
      "Balance after": r.balanceAfter,
      "Order number": r.order?.orderNumber ?? "",
      Note: r.reason ?? "",
    })),
  );
}

// ─── Subscriptions / donations ──────────────────────────────────────────────

export interface SubscriptionSheetRow {
  createdAt: Date;
  customerEmail: string;
  customerName: string | null;
  customerPhone: string | null;
  productName: string;
  variantName: string | null;
  sku: string | null;
  quantity: number;
  interval: string;
  intervalCount: number;
  listPriceCents: number;
  discountPercent: number;
  unitAmountCents: number;
  shippingCents: number;
  deliveryMethod: string;
  shipFirstName: string | null;
  shipLastName: string | null;
  shipAddress1: string | null;
  shipAddress2: string | null;
  shipCity: string | null;
  shipProvince: string | null;
  shipZip: string | null;
  shipCountry: string | null;
  status: string;
  nextBillingAt: Date | null;
  pauseResumesAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  stripeSubscriptionId: string | null;
}

/** week/1 → "Every week"; month/2 → "Every 2 months". */
export function formatCadence(interval: string, count: number): string {
  return count <= 1 ? `Every ${interval}` : `Every ${count} ${interval}s`;
}

export const SUBSCRIPTION_COLUMNS = [
  "Customer email",
  "Customer name",
  "Customer phone",
  "Product",
  "Variant",
  "SKU",
  "Quantity",
  "Repeats",
  "Status",
  "List price",
  "Subscriber discount (%)",
  "Price each (locked)",
  "Shipping per delivery",
  "Delivery method",
  "Ship to",
  "Started",
  "Next billing",
  "Resumes on",
  "Cancelled on",
  "Cancelled by",
  "Stripe subscription ID",
] as const;

export function subscriptionsSheet(
  subs: SubscriptionSheetRow[],
  ctx: SheetContext,
): Sheet {
  return sheet(
    SUBSCRIPTION_COLUMNS,
    subs.map((s) => ({
      "Customer email": s.customerEmail,
      "Customer name": s.customerName ?? "",
      "Customer phone": s.customerPhone ?? "",
      Product: s.productName,
      Variant: s.variantName ?? "",
      SKU: s.sku ?? "",
      Quantity: s.quantity,
      Repeats: formatCadence(s.interval, s.intervalCount),
      Status: humanize(s.status),
      "List price": centsToMoney(s.listPriceCents),
      "Subscriber discount (%)": s.discountPercent,
      "Price each (locked)": centsToMoney(s.unitAmountCents),
      "Shipping per delivery": centsToMoney(s.shippingCents),
      "Delivery method": humanize(s.deliveryMethod),
      "Ship to":
        s.deliveryMethod === "pickup"
          ? ""
          : joinParts(
              [
                joinParts([s.shipFirstName, s.shipLastName], " "),
                s.shipAddress1,
                s.shipAddress2,
                s.shipCity,
                joinParts([s.shipProvince, s.shipZip], " "),
                s.shipCountry,
              ],
              ", ",
            ),
      Started: formatDateTime(s.createdAt, ctx.timeZone),
      "Next billing": formatDateTime(s.nextBillingAt, ctx.timeZone),
      "Resumes on": formatDateTime(s.pauseResumesAt, ctx.timeZone),
      "Cancelled on": formatDateTime(s.cancelledAt, ctx.timeZone),
      "Cancelled by": humanize(s.cancelReason),
      "Stripe subscription ID": s.stripeSubscriptionId ?? "",
    })),
  );
}

export interface DonationSheetRow {
  createdAt: Date;
  amountCents: number;
  currency: string;
  donorName: string | null;
  donorEmail: string | null;
  message: string | null;
  stripePaymentIntentId: string | null;
}

export const DONATION_COLUMNS = [
  "Date",
  "Donor name",
  "Donor email",
  "Amount",
  "Currency",
  "Message",
  "Stripe payment ID",
] as const;

export function donationsSheet(
  donations: DonationSheetRow[],
  ctx: SheetContext,
): Sheet {
  return sheet(
    DONATION_COLUMNS,
    donations.map((d) => ({
      Date: formatDateTime(d.createdAt, ctx.timeZone),
      "Donor name": d.donorName ?? "",
      "Donor email": d.donorEmail ?? "",
      Amount: centsToMoney(d.amountCents),
      Currency: d.currency.toUpperCase(),
      Message: d.message ?? "",
      "Stripe payment ID": d.stripePaymentIntentId ?? "",
    })),
  );
}

// ─── Email subscribers ──────────────────────────────────────────────────────

export interface EmailSubscriberRow {
  email: string;
  firstName: string | null;
  lastName: string | null;
  orderCount: number;
  totalSpent: number;
  createdAt: Date;
  /** `Customer.marketingConsentSource`; null for rows from before tracking. */
  marketingConsentSource?: string | null;
  marketingConsentAt?: Date | null;
}

export const EMAIL_SUBSCRIBER_COLUMNS = [
  "Email",
  "First name",
  "Last name",
  "Number of orders",
  "Total spent",
  "Customer since",
  "Consent source",
  "Consent date",
] as const;

export function emailSubscribersSheet(
  rows: EmailSubscriberRow[],
  ctx: SheetContext,
): Sheet {
  return sheet(
    EMAIL_SUBSCRIBER_COLUMNS,
    rows.map((c) => ({
      Email: c.email,
      "First name": c.firstName ?? "",
      "Last name": c.lastName ?? "",
      "Number of orders": c.orderCount,
      "Total spent": centsToMoney(c.totalSpent),
      "Customer since": formatDateTime(c.createdAt, ctx.timeZone),
      "Consent source": marketingConsentSourceLabel(c.marketingConsentSource),
      "Consent date": c.marketingConsentAt
        ? formatDateTime(c.marketingConsentAt, ctx.timeZone)
        : "",
    })),
  );
}

// ─── Services / events / shipping ───────────────────────────────────────────

export interface ServiceSheetItem {
  name: string;
  description: string | null;
  priceLabel: string | null;
  durationLabel: string | null;
  compareAtPriceLabel: string | null;
  image: string | null;
  bookingEmbedSrc: string | null;
  isSignature: boolean;
  published: boolean;
  sortOrder: number;
}

export interface ServiceSheetService {
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  published: boolean;
  sortOrder: number;
  metaTitle: string | null;
  metaDescription: string | null;
  items: ServiceSheetItem[];
}

export const SERVICE_COLUMNS = [
  "Service name",
  "Web address ending (slug)",
  "Status",
  "Description",
  "Image URL",
  "Number of offerings",
  "Offerings",
  "Search title (SEO)",
  "Search description (SEO)",
] as const;

export function servicesSheet(services: ServiceSheetService[]): Sheet {
  return sheet(
    SERVICE_COLUMNS,
    [...services]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({
        "Service name": s.name,
        "Web address ending (slug)": s.slug,
        Status: s.published ? "Published" : "Draft",
        Description: plainText(s.description),
        "Image URL": s.image ?? "",
        "Number of offerings": s.items.length,
        Offerings: [...s.items]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((i) =>
            joinParts(
              [i.name, joinParts([i.priceLabel, i.durationLabel], ", ")],
              " - ",
            ),
          )
          .join("\n"),
        "Search title (SEO)": s.metaTitle ?? "",
        "Search description (SEO)": s.metaDescription ?? "",
      })),
  );
}

export const SERVICE_ITEM_COLUMNS = [
  "Service",
  "Offering",
  "Price",
  "Original price",
  "Duration",
  "Description",
  "Signature offering",
  "Status",
  "Image URL",
  "Booking link",
] as const;

export function serviceItemsSheet(services: ServiceSheetService[]): Sheet {
  return sheet(
    SERVICE_ITEM_COLUMNS,
    [...services]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .flatMap((s) =>
        [...s.items]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((i) => ({
            Service: s.name,
            Offering: i.name,
            Price: i.priceLabel ?? "",
            "Original price": i.compareAtPriceLabel ?? "",
            Duration: i.durationLabel ?? "",
            Description: plainText(i.description),
            "Signature offering": yesNo(i.isSignature),
            Status: i.published ? "Published" : "Draft",
            "Image URL": i.image ?? "",
            "Booking link": i.bookingEmbedSrc ?? "",
          })),
      ),
  );
}

export interface EventSheetEvent {
  name: string;
  slug: string;
  blurb: string | null;
  coverImage: string | null;
  coverVideo: string | null;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
  location: string | null;
  externalUrl: string | null;
  externalUrlLabel: string | null;
  priceLabel: string | null;
  published: boolean;
  isArchived: boolean;
}

export const EVENT_COLUMNS = [
  "Event name",
  "Web address ending (slug)",
  "Status",
  "Starts",
  "Ends",
  "All day",
  "Location",
  "Description",
  "Price",
  "Link",
  "Link label",
  "Flier image URL",
  "Flier video URL",
] as const;

export function eventsSheet(
  events: EventSheetEvent[],
  ctx: SheetContext,
): Sheet {
  // All-day events span whole local days, so only the date is meaningful.
  const when = (date: Date | null, allDay: boolean) =>
    allDay
      ? formatDateInZone(date, ctx.timeZone)
      : formatDateTime(date, ctx.timeZone);
  return sheet(
    EVENT_COLUMNS,
    [...events]
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
      .map((e) => ({
        "Event name": e.name,
        "Web address ending (slug)": e.slug,
        Status: !e.published
          ? "Draft"
          : e.isArchived
            ? "Past (archived)"
            : "Published",
        Starts: when(e.startAt, e.allDay),
        Ends: when(e.endAt, e.allDay),
        "All day": yesNo(e.allDay),
        Location: e.location ?? "",
        Description: plainText(e.blurb),
        Price: e.priceLabel ?? "",
        Link: e.externalUrl ?? "",
        "Link label": e.externalUrlLabel ?? "",
        "Flier image URL": e.coverImage ?? "",
        "Flier video URL": e.coverVideo ?? "",
      })),
  );
}

export interface ShippingSheetInput {
  shippingType: string;
  /** Cents. */
  shippingFlatRate: number | null;
  freeShippingThreshold: number | null;
  shippingFallbackRate: number | null;
  /** Parsed `[{ label, minLb, maxLb }]` */
  weightTiers: Array<{ label: string; minLb: number; maxLb: number | null }>;
  zones: Array<{
    name: string;
    states: string[];
    sortOrder: number;
    rates: Array<{ tierIndex: number; priceCents: number }>;
  }>;
}

export const SHIPPING_RATE_COLUMNS = [
  "Shipping zone",
  "States",
  "Package weight",
  "Shipping price",
] as const;

function weightRangeLabel(
  tier: { label: string; minLb: number; maxLb: number | null } | undefined,
  index: number,
): string {
  if (!tier) return `Tier ${index + 1}`;
  const range =
    tier.maxLb == null
      ? `${tier.minLb} lb and up`
      : `${tier.minLb}-${tier.maxLb} lb`;
  return tier.label && tier.label.trim() !== ""
    ? `${tier.label} (${range})`
    : range;
}

export function shippingRatesSheet(input: ShippingSheetInput): Sheet {
  const rows: Row[] = [];

  if (
    (input.shippingType === "flat_rate" ||
      input.shippingType === "flat_rate_with_threshold") &&
    input.shippingFlatRate != null
  ) {
    rows.push({
      "Shipping zone": "Everywhere",
      States: "All",
      "Package weight": "Flat rate",
      "Shipping price": centsToMoney(input.shippingFlatRate),
    });
    if (input.freeShippingThreshold != null) {
      rows.push({
        "Shipping zone": "Everywhere",
        States: "All",
        "Package weight": `Free when the order is ${centsToMoney(input.freeShippingThreshold)} or more`,
        "Shipping price": "0.00",
      });
    }
  }

  for (const zone of [...input.zones].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )) {
    for (const rate of [...zone.rates].sort(
      (a, b) => a.tierIndex - b.tierIndex,
    )) {
      rows.push({
        "Shipping zone": zone.name,
        States: zone.states.join(", "),
        "Package weight": weightRangeLabel(
          input.weightTiers[rate.tierIndex],
          rate.tierIndex,
        ),
        "Shipping price": centsToMoney(rate.priceCents),
      });
    }
  }

  if (input.zones.length > 0 && input.shippingFallbackRate != null) {
    rows.push({
      "Shipping zone": "Anywhere else",
      States: "All other states",
      "Package weight": "Any weight",
      "Shipping price": centsToMoney(input.shippingFallbackRate),
    });
  }

  return { columns: SHIPPING_RATE_COLUMNS, rows };
}

import { z } from "zod";

import { isRealCalendarDate } from "~/lib/calendar-date";
import {
  normalizeCashAppHandle,
  normalizeVenmoHandle,
} from "~/lib/donation-handles";
import { BPS_DENOMINATOR, computeInvoiceTotals } from "~/lib/invoices/totals";
import { MAX_REQUESTED_PAGE } from "~/lib/validators/admin-table";
import { quickBooksBillingAddressSchema } from "~/lib/validators/quickbooks";

/**
 * Schemas and enums for native (non-QuickBooks) invoices.
 *
 * Same conventions as `quickbooks.ts`: an `as const` tuple is the one source
 * of truth for each string union stored in a plain `String` column, a label
 * map renders it for UI, and the TS type is derived from the tuple.
 *
 * Client-safe on purpose — the builder form (`zodResolver`), the settings
 * page, the router and the cron all import from here, so nothing below may
 * reach for `server-only` code. The money math lives in
 * `~/lib/invoices/totals` and is imported (not re-implemented) so the
 * validator's overflow guard and the stored totals can never disagree.
 *
 * Two invariants worth knowing before editing:
 *
 * 1. **Every stored amount fits an `Int4`.** `invoiceDraftSchema` runs the real
 *    totals computation and rejects a subtotal or total above
 *    `INVOICE_MAX_TOTAL_CENTS` ($10M), comfortably under 2^31 − 1 cents. The
 *    per-line caps alone don't guarantee that (100 lines × $1M × 100000 qty
 *    overflows many times over), so the refine is load-bearing, not cosmetic.
 * 2. **Payment-method details are sensitive.** They are only ever stored
 *    encrypted (`InvoiceSettings.paymentMethods`, `Invoice.paymentInstructions`)
 *    and only ever rendered in full on the signed hosted page. Emails get
 *    `paymentMethodDisplayName` (see `~/lib/invoices/payment-methods`).
 */

// ─── Limits ─────────────────────────────────────────────────────────────────

/** $10M — the largest subtotal/total an invoice may carry. */
export const INVOICE_MAX_TOTAL_CENTS = 1_000_000_000;
/** $1M — the largest unit price on one line. */
export const INVOICE_MAX_UNIT_PRICE_CENTS = 100_000_000;
export const INVOICE_MAX_QUANTITY = 100_000;
export const INVOICE_MAX_LINE_ITEMS = 100;
export const INVOICE_MAX_PAYMENT_METHODS = 10;
export const INVOICE_ID_MAX_LENGTH = 64;
export const INVOICE_DESCRIPTION_MAX_LENGTH = 500;
export const INVOICE_NOTES_MAX_LENGTH = 2000;
export const INVOICE_TERMS_MAX_LENGTH = 5000;
export const INVOICE_MESSAGE_MAX_LENGTH = 2000;
export const INVOICE_CANCEL_REASON_MAX_LENGTH = 1000;
export const INVOICE_PAYMENT_REFERENCE_MAX_LENGTH = 200;
export const INVOICE_PAYMENT_NOTE_MAX_LENGTH = 2000;
export const INVOICE_NUMBER_PREFIX_MAX_LENGTH = 12;
export const INVOICE_SEARCH_MAX_LENGTH = 200;

export const INVOICE_DEFAULT_NUMBER_PREFIX = "INV-";
export const INVOICE_DEFAULT_NUMBER_PADDING = 4;
export const INVOICE_DEFAULT_STARTING_NUMBER = 1;

// ─── Status ─────────────────────────────────────────────────────────────────

/**
 * `DRAFT` → `SENT` → `PARTIALLY_PAID` → `PAID`, or → `CANCELLED` from SENT /
 * PARTIALLY_PAID. The three payment states are never set by hand — they are
 * re-derived from `amountPaidCents` on every payment write
 * (`deriveInvoiceStatus` in `~/lib/invoices/status`). "Overdue" is not a
 * status; it is computed from `dueDate` on read (`isInvoiceOverdue`).
 */
export const INVOICE_STATUS_VALUES = [
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUS_VALUES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

/** Sent and still owed money — the statuses that can go overdue, be paid, reminded or cancelled. */
export const INVOICE_OPEN_STATUSES = ["SENT", "PARTIALLY_PAID"] as const;
export type InvoiceOpenStatus = (typeof INVOICE_OPEN_STATUSES)[number];

// ─── Due terms ──────────────────────────────────────────────────────────────

export const INVOICE_DUE_TERMS_VALUES = [
  "receipt",
  "net_7",
  "net_15",
  "net_30",
  "net_60",
  "custom",
] as const;
export type InvoiceDueTerms = (typeof INVOICE_DUE_TERMS_VALUES)[number];

export const INVOICE_DUE_TERMS_LABELS: Record<InvoiceDueTerms, string> = {
  receipt: "Due on receipt",
  net_7: "Net 7",
  net_15: "Net 15",
  net_30: "Net 30",
  net_60: "Net 60",
  custom: "Custom date",
};

/** Days after the issue date each preset falls due. `custom` has none — it carries its own date. */
export const INVOICE_DUE_TERMS_DAYS: Record<
  Exclude<InvoiceDueTerms, "custom">,
  number
> = {
  receipt: 0,
  net_7: 7,
  net_15: 15,
  net_30: 30,
  net_60: 60,
};

/**
 * The terms a business may pick as its DEFAULT. `custom` is excluded: a
 * default can't carry a specific date that would be stale on every later
 * invoice.
 */
export const INVOICE_SETTINGS_DUE_TERMS_VALUES = [
  "receipt",
  "net_7",
  "net_15",
  "net_30",
  "net_60",
] as const satisfies readonly Exclude<InvoiceDueTerms, "custom">[];
export type InvoiceSettingsDueTerms =
  (typeof INVOICE_SETTINGS_DUE_TERMS_VALUES)[number];

export const INVOICE_DEFAULT_DUE_TERMS: InvoiceSettingsDueTerms = "net_30";

// ─── Discount ───────────────────────────────────────────────────────────────

/** `flat` = `discountValue` is cents; `percent` = `discountValue` is basis points. */
export const INVOICE_DISCOUNT_TYPE_VALUES = ["flat", "percent"] as const;
export type InvoiceDiscountType = (typeof INVOICE_DISCOUNT_TYPE_VALUES)[number];

export const INVOICE_DISCOUNT_TYPE_LABELS: Record<InvoiceDiscountType, string> =
  {
    flat: "Amount ($)",
    percent: "Percent (%)",
  };

// ─── Payment methods ────────────────────────────────────────────────────────

/** The ways an owner can ask to be paid — configured once in Invoice settings. */
export const INVOICE_PAYMENT_METHOD_TYPE_VALUES = [
  "bank_transfer",
  "paypal",
  "venmo",
  "cash_app",
  "zelle",
  "cash_check",
  "other",
] as const;
export type InvoicePaymentMethodType =
  (typeof INVOICE_PAYMENT_METHOD_TYPE_VALUES)[number];

export const INVOICE_PAYMENT_METHOD_TYPE_LABELS: Record<
  InvoicePaymentMethodType,
  string
> = {
  bank_transfer: "Bank transfer",
  paypal: "PayPal",
  venmo: "Venmo",
  cash_app: "Cash App",
  zelle: "Zelle",
  cash_check: "Cash or check",
  other: "Other",
};

/**
 * How a RECORDED payment arrived — every configurable method plus `card`,
 * because an owner may take a card payment in person (a terminal, a Square
 * reader) without that ever being an invoice payment option.
 */
export const INVOICE_PAYMENT_RECORD_METHOD_VALUES = [
  ...INVOICE_PAYMENT_METHOD_TYPE_VALUES,
  "card",
] as const;
export type InvoicePaymentRecordMethod =
  (typeof INVOICE_PAYMENT_RECORD_METHOD_VALUES)[number];

export const INVOICE_PAYMENT_RECORD_METHOD_LABELS: Record<
  InvoicePaymentRecordMethod,
  string
> = {
  ...INVOICE_PAYMENT_METHOD_TYPE_LABELS,
  card: "Card",
};

export const INVOICE_BANK_ACCOUNT_TYPE_VALUES = [
  "checking",
  "savings",
] as const;
export type InvoiceBankAccountType =
  (typeof INVOICE_BANK_ACCOUNT_TYPE_VALUES)[number];

export const INVOICE_BANK_ACCOUNT_TYPE_LABELS: Record<
  InvoiceBankAccountType,
  string
> = {
  checking: "Checking",
  savings: "Savings",
};

// ─── Events ─────────────────────────────────────────────────────────────────

/** `InvoiceEvent.type`. Metadata on these rows must never carry sensitive data. */
export const INVOICE_EVENT_TYPE_VALUES = [
  "CREATED",
  "UPDATED",
  "SENT",
  "MARKED_SENT",
  "EMAIL_FAILED",
  "VIEWED",
  "REMINDER_SENT",
  "PAYMENT_RECORDED",
  "PAYMENT_DELETED",
  "RECEIPT_SENT",
  "CANCELLED",
  "OVERDUE_ALERTED",
] as const;
export type InvoiceEventType = (typeof INVOICE_EVENT_TYPE_VALUES)[number];

export const INVOICE_EVENT_TYPE_LABELS: Record<InvoiceEventType, string> = {
  CREATED: "Created",
  UPDATED: "Edited",
  SENT: "Emailed to customer",
  MARKED_SENT: "Marked as sent",
  EMAIL_FAILED: "Email failed to send",
  VIEWED: "Viewed by customer",
  REMINDER_SENT: "Reminder sent",
  PAYMENT_RECORDED: "Payment recorded",
  PAYMENT_DELETED: "Payment deleted",
  RECEIPT_SENT: "Receipt sent",
  CANCELLED: "Cancelled",
  OVERDUE_ALERTED: "Overdue alert sent to you",
};

// ─── Send ───────────────────────────────────────────────────────────────────

/** `Invoice.sentVia`. `manual` = "Mark as sent without emailing". */
export const INVOICE_SEND_DELIVERY_VALUES = ["email", "manual"] as const;
export type InvoiceSendDelivery = (typeof INVOICE_SEND_DELIVERY_VALUES)[number];

// ─── List filters / sort ────────────────────────────────────────────────────

/**
 * The unified `/admin/invoices` vocabulary (native + QuickBooks rows). Tuple
 * order is tab/menu order. How each filter maps onto each source lives in
 * `~/lib/invoices/unified-list` (`matchesListStatusFilter`,
 * `nativeListStatusWhere`) — keep a new value in step with BOTH.
 *
 * `outstanding` includes overdue invoices; `overdue` is the subset past due.
 * QuickBooks `pending`/`error` rows match no tab but `all`.
 */
export const INVOICE_LIST_STATUS_FILTER_VALUES = [
  "all",
  "draft",
  "outstanding",
  "overdue",
  "paid",
  "cancelled",
] as const;
export const INVOICE_LIST_STATUS_FILTER_DEFAULT = "all";
export type InvoiceListStatusFilter =
  (typeof INVOICE_LIST_STATUS_FILTER_VALUES)[number];

export const INVOICE_LIST_STATUS_FILTER_LABELS: Record<
  InvoiceListStatusFilter,
  string
> = {
  all: "All",
  draft: "Draft",
  outstanding: "Outstanding",
  overdue: "Overdue",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const INVOICE_LIST_SOURCE_FILTER_VALUES = [
  "all",
  "native",
  "quickbooks",
] as const;
export const INVOICE_LIST_SOURCE_FILTER_DEFAULT = "all";
export type InvoiceListSourceFilter =
  (typeof INVOICE_LIST_SOURCE_FILTER_VALUES)[number];

export const INVOICE_LIST_SOURCE_FILTER_LABELS: Record<
  InvoiceListSourceFilter,
  string
> = {
  all: "All sources",
  native: "SimplePress",
  quickbooks: "QuickBooks",
};

/**
 * Spelled like `QBO_INVOICE_SORT_VALUES` (kebab-case) because the unified page
 * replaces that one and existing bookmarked `?sort=` URLs keep working for
 * every value both share.
 *
 * Only keys that sort IDENTICALLY in SQL and in JS are offered: the merge in
 * `mergeUnifiedPage` is only correct if Postgres orders the native rows
 * exactly as `compareUnifiedRows` does. Customer-name sorts are omitted for
 * that reason — Postgres collation and `localeCompare` disagree on case and
 * punctuation. A by-number sort is omitted because QuickBooks doc numbers are
 * free-form strings with no shared numeric space.
 */
export const INVOICE_LIST_SORT_VALUES = [
  "newest",
  "oldest",
  "due-asc",
  "amount-desc",
  "amount-asc",
] as const;
export const INVOICE_LIST_SORT_DEFAULT = "newest";
export type InvoiceListSort = (typeof INVOICE_LIST_SORT_VALUES)[number];

export const INVOICE_LIST_SORT_LABELS: Record<InvoiceListSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  "due-asc": "Due soonest",
  "amount-desc": "Highest amount",
  "amount-asc": "Lowest amount",
};

// ─── Shared field schemas ───────────────────────────────────────────────────

const idField = z.string().min(1).max(INVOICE_ID_MAX_LENGTH);

/** A real `YYYY-MM-DD` calendar date (rejects `2026-02-30`). */
export const invoiceYmdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine(isRealCalendarDate, "Enter a real calendar date");

function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .optional();
}

function requiredText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);
}

// ─── Line items ─────────────────────────────────────────────────────────────

/**
 * One free-form line. `productId`/`variantId`/`serviceItemId` only record
 * where a catalog-picked line came from — the description and price are
 * copied, so a later catalog edit never changes an invoice.
 *
 * `id` is a client-generated key (react-hook-form `useFieldArray` row key); it
 * has no meaning beyond keeping rows stable while editing.
 */
export const invoiceLineItemSchema = z.object({
  id: idField,
  description: requiredText(INVOICE_DESCRIPTION_MAX_LENGTH, "Description"),
  quantity: z
    .number({ invalid_type_error: "Enter a quantity" })
    .positive("Quantity must be more than 0")
    .max(
      INVOICE_MAX_QUANTITY,
      `Quantity can be at most ${INVOICE_MAX_QUANTITY}`,
    )
    .refine(
      (value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-6,
      "Use at most 3 decimal places",
    ),
  unitPriceCents: z
    .number({ invalid_type_error: "Enter a price" })
    .int()
    .min(0, "Price can't be negative")
    .max(INVOICE_MAX_UNIT_PRICE_CENTS, "Price can be at most $1,000,000"),
  productId: idField.optional(),
  variantId: idField.optional(),
  serviceItemId: idField.optional(),
});
export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;
export type InvoiceLineItemInput = z.input<typeof invoiceLineItemSchema>;

// ─── Payment method config ──────────────────────────────────────────────────

const paymentMethodBase = {
  id: idField,
  /** Optional owner-facing display name ("Business checking"). Shown in emails — never put account details here. */
  label: optionalText(60, "Label"),
};

/**
 * PayPal accepts whatever the owner pastes — `jane`, `@jane`,
 * `paypal.me/jane`, `https://www.paypal.me/jane/` — and stores the bare
 * username, so `buildPaymentInstructions` can build one canonical link.
 */
function normalizePayPalHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?paypal\.me\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "");
}

export const bankTransferPaymentMethodSchema = z.object({
  ...paymentMethodBase,
  type: z.literal("bank_transfer"),
  accountName: requiredText(100, "Account holder name"),
  bankName: requiredText(100, "Bank name"),
  routingNumber: z
    .string()
    .trim()
    .regex(/^\d{9}$/, "Routing numbers are 9 digits"),
  accountNumber: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{4,17}$/, "Use 4–17 letters or digits, no spaces"),
  accountType: z.enum(INVOICE_BANK_ACCOUNT_TYPE_VALUES).optional(),
  swift: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^([A-Z0-9]{8}|[A-Z0-9]{11})?$/,
      "SWIFT/BIC codes are 8 or 11 characters",
    )
    .optional(),
  instructions: optionalText(1000, "Instructions"),
});

export const payPalPaymentMethodSchema = z.object({
  ...paymentMethodBase,
  type: z.literal("paypal"),
  /** paypal.me username, stored bare. */
  handle: z
    .string()
    .max(200)
    .transform(normalizePayPalHandle)
    .refine(
      (value) => value === "" || /^[A-Za-z0-9._-]{1,50}$/.test(value),
      "Enter a PayPal.Me username or link",
    )
    .optional(),
  email: z
    .string()
    .trim()
    .max(254)
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "Enter a valid email",
    )
    .optional(),
});

export const venmoPaymentMethodSchema = z.object({
  ...paymentMethodBase,
  type: z.literal("venmo"),
  /** Stored without the leading "@", like `Business.venmoHandle`. */
  handle: z
    .string()
    .max(60)
    .transform((value) => normalizeVenmoHandle(value) ?? "")
    .refine(
      (value) => /^[A-Za-z0-9_-]{1,30}$/.test(value),
      "Enter a Venmo username",
    ),
});

export const cashAppPaymentMethodSchema = z.object({
  ...paymentMethodBase,
  type: z.literal("cash_app"),
  /** Stored without the leading "$", like `Business.cashAppHandle`. */
  cashtag: z
    .string()
    .max(60)
    .transform((value) => normalizeCashAppHandle(value) ?? "")
    .refine((value) => /^[A-Za-z0-9_-]{1,20}$/.test(value), "Enter a $Cashtag"),
});

export const zellePaymentMethodSchema = z.object({
  ...paymentMethodBase,
  type: z.literal("zelle"),
  emailOrPhone: requiredText(254, "Zelle email or phone"),
  /** The name the customer will see in their banking app, so they know they've got the right recipient. */
  name: requiredText(100, "Recipient name"),
});

export const cashCheckPaymentMethodSchema = z.object({
  ...paymentMethodBase,
  type: z.literal("cash_check"),
  payableTo: requiredText(100, "Payable to"),
  mailingAddress: optionalText(500, "Mailing address"),
  instructions: optionalText(1000, "Instructions"),
});

export const otherPaymentMethodSchema = z.object({
  ...paymentMethodBase,
  type: z.literal("other"),
  title: requiredText(60, "Title"),
  instructions: requiredText(1000, "Instructions"),
});

/**
 * One configured way to get paid. PayPal's "handle OR email" rule sits on the
 * union rather than the member because zod 3's `discriminatedUnion` only
 * accepts plain objects (a refined member is a `ZodEffects`).
 */
export const paymentMethodSchema = z
  .discriminatedUnion("type", [
    bankTransferPaymentMethodSchema,
    payPalPaymentMethodSchema,
    venmoPaymentMethodSchema,
    cashAppPaymentMethodSchema,
    zellePaymentMethodSchema,
    cashCheckPaymentMethodSchema,
    otherPaymentMethodSchema,
  ])
  .superRefine((method, ctx) => {
    if (method.type === "paypal" && !method.handle && !method.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["handle"],
        message: "Enter a PayPal.Me username or a PayPal email",
      });
    }
  });
export type InvoicePaymentMethod = z.infer<typeof paymentMethodSchema>;
export type InvoicePaymentMethodInput = z.input<typeof paymentMethodSchema>;

// ─── Draft (create / update) ────────────────────────────────────────────────

export const invoiceCustomerSchema = z.object({
  /** Existing `Customer` row, when picked. The router checks it belongs to this business. */
  customerId: idField.optional(),
  name: requiredText(200, "Customer name"),
  email: z
    .string()
    .trim()
    .min(1, "Customer email is required")
    .email("Enter a valid email")
    .max(254),
  phone: optionalText(40, "Phone"),
  billingAddress: quickBooksBillingAddressSchema.optional(),
});
export type InvoiceCustomerInput = z.infer<typeof invoiceCustomerSchema>;

const invoiceDraftShape = {
  customer: invoiceCustomerSchema,
  lineItems: z
    .array(invoiceLineItemSchema)
    .min(1, "Add at least one line item")
    .max(
      INVOICE_MAX_LINE_ITEMS,
      `An invoice can have at most ${INVOICE_MAX_LINE_ITEMS} lines`,
    ),
  discountType: z.enum(INVOICE_DISCOUNT_TYPE_VALUES).nullish(),
  /** Cents (`flat`) or basis points (`percent`); ignored with no `discountType`. */
  discountValue: z
    .number()
    .int()
    .min(0)
    .max(INVOICE_MAX_TOTAL_CENTS)
    .default(0),
  taxRateBps: z.number().int().min(0).max(BPS_DENOMINATOR).default(0),
  dueTerms: z.enum(INVOICE_DUE_TERMS_VALUES),
  /** Required when `dueTerms` is `custom`; an empty form input reads as absent. */
  customDueDate: invoiceYmdSchema
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: optionalText(INVOICE_NOTES_MAX_LENGTH, "Notes"),
  terms: optionalText(INVOICE_TERMS_MAX_LENGTH, "Terms"),
  paymentMethodIds: z
    .array(idField)
    .max(INVOICE_MAX_PAYMENT_METHODS)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "A payment method is selected twice",
    )
    .default([]),
};

type InvoiceDraftShapeOutput = z.infer<z.ZodObject<typeof invoiceDraftShape>>;

/**
 * Cross-field rules shared by create and update. Runs the real totals
 * computation — see invariant 1 in the header.
 */
function refineInvoiceDraft(
  draft: InvoiceDraftShapeOutput,
  ctx: z.RefinementCtx,
): void {
  if (draft.dueTerms === "custom" && !draft.customDueDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customDueDate"],
      message: "Pick a due date",
    });
  }

  if (
    draft.discountType === "percent" &&
    draft.discountValue > BPS_DENOMINATOR
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discountValue"],
      message: "A percent discount can be at most 100%",
    });
  }

  const totals = computeInvoiceTotals({
    lineItems: draft.lineItems,
    discountType: draft.discountType,
    discountValue: draft.discountValue,
    taxRateBps: draft.taxRateBps,
  });
  if (
    totals.subtotalCents > INVOICE_MAX_TOTAL_CENTS ||
    totals.totalCents > INVOICE_MAX_TOTAL_CENTS
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lineItems"],
      message: "An invoice can total at most $10,000,000",
    });
  }
}

/** Input to `invoice.create`, and the builder form's resolver schema. */
export const invoiceDraftSchema = z
  .object(invoiceDraftShape)
  .superRefine(refineInvoiceDraft);
export type InvoiceDraft = z.infer<typeof invoiceDraftSchema>;
export type InvoiceDraftInput = z.input<typeof invoiceDraftSchema>;

/** Input to `invoice.update` — the full draft plus its id (drafts only; enforced by the router). */
export const invoiceUpdateSchema = z
  .object({ id: idField, ...invoiceDraftShape })
  .superRefine(refineInvoiceDraft);
export type InvoiceUpdate = z.infer<typeof invoiceUpdateSchema>;

export const invoiceIdSchema = z.object({ id: idField });

// ─── Lifecycle actions ──────────────────────────────────────────────────────

export const invoiceSendSchema = z.object({
  id: idField,
  deliver: z.enum(INVOICE_SEND_DELIVERY_VALUES),
  /** Optional note from the owner, shown in the email above the summary. */
  message: optionalText(INVOICE_MESSAGE_MAX_LENGTH, "Message"),
});
export type InvoiceSendInput = z.infer<typeof invoiceSendSchema>;

/**
 * `amountCents` is only bounded here; the router rejects an amount above the
 * current balance (inside the compare-and-swap transaction, where the balance
 * is actually known).
 */
export const recordPaymentSchema = z.object({
  invoiceId: idField,
  amountCents: z
    .number()
    .int()
    .min(1, "Enter an amount of at least $0.01")
    .max(INVOICE_MAX_TOTAL_CENTS),
  paidOn: invoiceYmdSchema,
  method: z.enum(INVOICE_PAYMENT_RECORD_METHOD_VALUES),
  reference: optionalText(INVOICE_PAYMENT_REFERENCE_MAX_LENGTH, "Reference"),
  note: optionalText(INVOICE_PAYMENT_NOTE_MAX_LENGTH, "Note"),
  emailReceipt: z.boolean().default(false),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const deletePaymentSchema = z.object({ paymentId: idField });
export type DeletePaymentInput = z.infer<typeof deletePaymentSchema>;

export const cancelInvoiceSchema = z.object({
  id: idField,
  reason: optionalText(INVOICE_CANCEL_REASON_MAX_LENGTH, "Reason"),
  notifyCustomer: z.boolean().default(false),
});
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>;

export const sendReminderSchema = z.object({
  id: idField,
  message: optionalText(INVOICE_MESSAGE_MAX_LENGTH, "Message"),
});
export type SendReminderInput = z.infer<typeof sendReminderSchema>;

// ─── Settings ───────────────────────────────────────────────────────────────

/**
 * `numberPrefix` is limited to characters that survive a URL, a filename
 * (print → save as PDF) and `parseInvoiceNumberQuery` unchanged. Empty is
 * allowed ("0001").
 */
export const INVOICE_NUMBER_PREFIX_PATTERN = /^[A-Za-z0-9#_./-]*$/;

export const invoiceSettingsSchema = z.object({
  numberPrefix: z
    .string()
    .trim()
    .max(
      INVOICE_NUMBER_PREFIX_MAX_LENGTH,
      `Prefix must be ${INVOICE_NUMBER_PREFIX_MAX_LENGTH} characters or fewer`,
    )
    .regex(
      INVOICE_NUMBER_PREFIX_PATTERN,
      "Use letters, numbers, and # - _ . / only",
    ),
  numberPadding: z.number().int().min(1).max(8),
  /** A floor, not a counter: the next number is max(highest existing + 1, startingNumber). */
  startingNumber: z.number().int().min(1).max(9_999_999),
  defaultDueTerms: z.enum(INVOICE_SETTINGS_DUE_TERMS_VALUES),
  defaultTaxRateBps: z.number().int().min(0).max(BPS_DENOMINATOR),
  defaultNotes: optionalText(INVOICE_NOTES_MAX_LENGTH, "Default notes"),
  defaultTerms: optionalText(INVOICE_TERMS_MAX_LENGTH, "Default terms"),
  paymentMethods: z
    .array(paymentMethodSchema)
    .max(
      INVOICE_MAX_PAYMENT_METHODS,
      `Add at most ${INVOICE_MAX_PAYMENT_METHODS} payment methods`,
    )
    .superRefine((methods, ctx) => {
      // Invoices reference methods by id (`Invoice.paymentMethodIds`), so a
      // duplicate id would make "which one did the owner tick?" ambiguous.
      const seen = new Set<string>();
      methods.forEach((method, index) => {
        if (seen.has(method.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, "id"],
            message: "Duplicate payment method id",
          });
        }
        seen.add(method.id);
      });
    }),
  overdueAlertsEnabled: z.boolean(),
  weeklyDigestEnabled: z.boolean(),
});
export type InvoiceSettingsInput = z.infer<typeof invoiceSettingsSchema>;
export type InvoiceSettingsFormInput = z.input<typeof invoiceSettingsSchema>;

// ─── List params ────────────────────────────────────────────────────────────

export const invoiceListParamsSchema = z.object({
  search: z.string().trim().max(INVOICE_SEARCH_MAX_LENGTH).optional(),
  status: z
    .enum(INVOICE_LIST_STATUS_FILTER_VALUES)
    .default(INVOICE_LIST_STATUS_FILTER_DEFAULT),
  source: z
    .enum(INVOICE_LIST_SOURCE_FILTER_VALUES)
    .default(INVOICE_LIST_SOURCE_FILTER_DEFAULT),
  sort: z.enum(INVOICE_LIST_SORT_VALUES).default(INVOICE_LIST_SORT_DEFAULT),
  page: z.number().int().positive().max(MAX_REQUESTED_PAGE).default(1),
});
export type InvoiceListParams = z.infer<typeof invoiceListParamsSchema>;

// ─── Issuer snapshot ────────────────────────────────────────────────────────

/**
 * `Invoice.issuerSnapshot` — the business's PUBLIC details copied at send, so
 * the hosted page, print view and emails keep showing who issued the invoice
 * even after the business renames or moves. Public data only: this column is
 * plain `Json`, not encrypted.
 */
export const invoiceIssuerSnapshotSchema = z.object({
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  /** Pre-formatted address lines, top to bottom. */
  addressLines: z.array(z.string()),
  logoUrl: z.string().nullable(),
  /** A CSS color for accents on the hosted page, or null for the default. */
  accentColor: z.string().nullable(),
});
export type InvoiceIssuerSnapshot = z.infer<typeof invoiceIssuerSnapshotSchema>;

/** Reads `Invoice.issuerSnapshot` back; `null` when absent (drafts) or unrecognizable. Never throws. */
export function parseIssuerSnapshot(
  json: unknown,
): InvoiceIssuerSnapshot | null {
  const result = invoiceIssuerSnapshotSchema.safeParse(json);
  return result.success ? result.data : null;
}

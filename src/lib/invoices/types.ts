/**
 * One import path for the invoice types other layers render — emails, the
 * shared `InvoiceDocument`, the hosted page, the admin UI. Type-only
 * re-exports, so importing this file never pulls zod or server code into a
 * bundle. Each type is DEFINED next to the code that produces it.
 */

export type {
  InvoiceDiscountType,
  InvoiceDraft,
  InvoiceDraftInput,
  InvoiceDueTerms,
  InvoiceEventType,
  InvoiceIssuerSnapshot,
  InvoiceLineItem,
  InvoiceListParams,
  InvoiceListSort,
  InvoiceListSourceFilter,
  InvoiceListStatusFilter,
  InvoicePaymentMethod,
  InvoicePaymentMethodType,
  InvoicePaymentRecordMethod,
  InvoiceSettingsInput,
  InvoiceStatus,
} from "~/lib/validators/invoice";
export type {
  InvoicePaymentInstruction,
  InvoicePaymentInstructionLine,
} from "./payment-methods";
export type { InvoiceCapabilities } from "./status";
export type { InvoiceTotals } from "./totals";
export type {
  UnifiedInvoiceRow,
  UnifiedInvoiceSource,
  UnifiedInvoiceStatus,
} from "./unified-list";

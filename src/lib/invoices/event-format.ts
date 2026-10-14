import type { InvoiceEventType } from "~/lib/validators/invoice";
import { formatPrice } from "~/lib/prices";
import {
  INVOICE_EVENT_TYPE_GROUPS,
  INVOICE_EVENT_TYPE_LABELS,
  INVOICE_PAYMENT_RECORD_METHOD_LABELS,
} from "~/lib/validators/invoice";

/**
 * Display helpers for `InvoiceEvent` rows — pure (no "use client", no
 * server-only), shared by the per-invoice Activity card, the store-wide
 * Activity table and the server-side CSV export.
 */

export function isKnownEventType(type: string): type is InvoiceEventType {
  return type in INVOICE_EVENT_TYPE_LABELS;
}

/** The human label for an event type; an unknown (older/newer) type prints raw. */
export function invoiceEventLabel(type: string): string {
  return isKnownEventType(type) ? INVOICE_EVENT_TYPE_LABELS[type] : type;
}

/** Filter-group label ("Sending" | "Payments" | "Problems"), or null if unknown. */
export function invoiceEventGroup(type: string): string | null {
  return (
    INVOICE_EVENT_TYPE_GROUPS.find((group) =>
      (group.types as readonly string[]).includes(type),
    )?.label ?? null
  );
}

/**
 * Who to show when an event has no `actorUserId`: the customer opened the
 * hosted page, the cron sent the overdue alert, everything else is unknown.
 */
export function invoiceEventActorFallback(type: string): string | null {
  if (type === "VIEWED") return "Customer";
  if (type === "OVERDUE_ALERTED") return "System";
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A short, best-effort gloss on an event's `metadata` — tolerant of any
 * shape, since these rows may come from data written by an earlier version
 * of the logger. Never includes anything sensitive: `logInvoiceEvent`
 * metadata is documented as non-sensitive-only, and this only reads keys that
 * match that contract.
 */
export function metadataSummary(metadata: unknown): string[] {
  if (!isRecord(metadata)) return [];
  const parts: string[] = [];

  if (typeof metadata.amountCents === "number") {
    parts.push(formatPrice(metadata.amountCents));
  }
  if (typeof metadata.method === "string") {
    const labels: Record<string, string> = INVOICE_PAYMENT_RECORD_METHOD_LABELS;
    parts.push(labels[metadata.method] ?? metadata.method);
  }
  if (typeof metadata.to === "string") {
    parts.push(`to ${metadata.to}`);
  }
  if (typeof metadata.reminderCount === "number") {
    parts.push(`reminder #${metadata.reminderCount}`);
  }
  if (typeof metadata.notifyCustomer === "boolean") {
    parts.push(
      metadata.notifyCustomer ? "customer notified" : "customer not notified",
    );
  }
  if (typeof metadata.kind === "string") {
    parts.push(`(${metadata.kind})`);
  }
  return parts;
}

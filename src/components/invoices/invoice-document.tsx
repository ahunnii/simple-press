/* eslint-disable @next/next/no-img-element */
import { formatPrice } from "~/lib/prices";

export type InvoiceDocumentLineItem = {
  /** React key when provided; falls back to the row's index. */
  id?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  /** Line total in cents — not necessarily `quantity * unitPriceCents` once
   * rounding is applied upstream, so it is always passed explicitly rather
   * than recomputed here. */
  amountCents: number;
  /** Renders the row as a muted, dashed placeholder instead of real numbers —
   * the builder's live preview uses this for its "Add a line item" row when
   * the draft has none yet. Never set by the detail page, print page or
   * hosted page, which always have real lines. */
  muted?: boolean;
};

export type InvoiceDocumentIssuer = {
  businessName: string;
  logoUrl?: string | null;
  /** Pre-split address lines, e.g. street / city+state+zip. */
  addressLines?: string[];
  email?: string | null;
  phone?: string | null;
};

export type InvoiceDocumentBillTo = {
  name: string;
  email: string;
  phone?: string | null;
  addressLines?: string[];
};

export type InvoiceDocumentStatus = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
};

export type InvoiceDocumentTotals = {
  subtotalCents: number;
  /** Omit or `0` to hide the discount row. */
  discountCents?: number;
  /** e.g. "Discount (10%)" — falls back to "Discount" when omitted. */
  discountLabel?: string;
  /** Omit or `0` to hide the tax row. */
  taxCents?: number;
  /** e.g. "6.25%" — appended to the "Tax" label in parentheses when given. */
  taxRateLabel?: string;
  totalCents: number;
  /** Omit or `0` to hide the "Paid" row. */
  amountPaidCents?: number;
  balanceDueCents: number;
};

export type InvoiceDocumentProps = {
  invoiceNumber: string;
  status?: InvoiceDocumentStatus;
  /** Pre-formatted, e.g. "September 23, 2026". Omitted for a draft with no issue date yet. */
  issueDateLabel?: string;
  /** Pre-formatted, e.g. "October 15, 2026". Omitted for a draft with no due date yet. */
  dueDateLabel?: string;
  issuer: InvoiceDocumentIssuer;
  billTo: InvoiceDocumentBillTo;
  lineItems: InvoiceDocumentLineItem[];
  totals: InvoiceDocumentTotals;
  notes?: string;
  terms?: string;
  /**
   * Rendered under a "How to pay" heading. The hosted customer page passes
   * interactive payment instructions (copy buttons, Venmo/Cash App links);
   * the admin print/preview passes a static list, or omits it entirely.
   */
  paymentSlot?: React.ReactNode;
  /** Applied via inline style to the "Invoice" heading rule and the invoice number only. */
  accentColor?: string;
};

const toneClasses: Record<
  NonNullable<InvoiceDocumentStatus["tone"]>,
  string
> = {
  neutral: "bg-neutral-100 text-neutral-700 border-neutral-300",
  success: "bg-emerald-50 text-emerald-700 border-emerald-300",
  warning: "bg-amber-50 text-amber-800 border-amber-300",
  danger: "bg-red-50 text-red-700 border-red-300",
};

/**
 * Server-safe, presentational invoice document. Shared by the admin preview,
 * the admin print page and the public hosted invoice page — no hooks, no
 * client-only APIs, so it renders identically in all three contexts.
 */
export function InvoiceDocument({
  invoiceNumber,
  status,
  issueDateLabel,
  dueDateLabel,
  issuer,
  billTo,
  lineItems,
  totals,
  notes,
  terms,
  paymentSlot,
  accentColor,
}: InvoiceDocumentProps) {
  const discountLabel = totals.discountLabel ?? "Discount";
  const taxLabel = totals.taxRateLabel ? `Tax (${totals.taxRateLabel})` : "Tax";

  return (
    <div className="bg-white text-neutral-900 print:bg-white">
      {/* Header: issuer block + Invoice heading */}
      <header className="flex flex-col-reverse items-start justify-between gap-6 border-b-2 border-neutral-900 pb-6 sm:flex-row">
        <div className="min-w-0">
          {issuer.logoUrl && (
            <img
              src={issuer.logoUrl}
              alt=""
              className="mb-3 h-12 w-auto object-contain"
            />
          )}
          <p className="text-lg font-bold">{issuer.businessName}</p>
          {issuer.addressLines?.map((line, index) => (
            <p key={index} className="text-sm text-neutral-600">
              {line}
            </p>
          ))}
          {issuer.email && (
            <p className="text-sm text-neutral-600">{issuer.email}</p>
          )}
          {issuer.phone && (
            <p className="text-sm text-neutral-600">{issuer.phone}</p>
          )}
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <h1
            className="text-2xl font-bold tracking-tight uppercase"
            style={accentColor ? { color: accentColor } : undefined}
          >
            Invoice
          </h1>
          <p
            className="mt-1 text-sm font-semibold"
            style={accentColor ? { color: accentColor } : undefined}
          >
            {invoiceNumber}
          </p>
          {issueDateLabel && (
            <p className="mt-2 text-sm text-neutral-600">
              Issued {issueDateLabel}
            </p>
          )}
          {dueDateLabel && (
            <p className="text-sm text-neutral-600">Due {dueDateLabel}</p>
          )}
          {status && (
            <span
              className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClasses[status.tone ?? "neutral"]}`}
            >
              {status.label}
            </span>
          )}
        </div>
      </header>

      {/* Bill-to */}
      <section className="py-6">
        <h2 className="mb-1.5 text-xs font-bold tracking-wide text-neutral-500 uppercase">
          Bill To
        </h2>
        <div className="text-sm">
          <p className="font-medium">{billTo.name}</p>
          <p className="text-neutral-600">{billTo.email}</p>
          {billTo.phone && <p className="text-neutral-600">{billTo.phone}</p>}
          {billTo.addressLines?.map((line, index) => (
            <p key={index} className="text-neutral-600">
              {line}
            </p>
          ))}
        </div>
      </section>

      {/* Line items */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-neutral-900 text-left">
            <th className="py-2 pr-4 font-bold">Description</th>
            <th className="py-2 pr-4 text-right font-bold">Qty</th>
            <th className="py-2 pr-4 text-right font-bold">Unit price</th>
            <th className="py-2 text-right font-bold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, index) => (
            <tr
              key={item.id ?? index}
              className={`break-inside-avoid border-b border-neutral-200 ${
                item.muted ? "text-neutral-400 italic" : ""
              }`}
            >
              <td className="py-2.5 pr-4">{item.description}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {item.muted ? "—" : item.quantity}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {item.muted ? "—" : formatPrice(item.unitPriceCents)}
              </td>
              <td className="py-2.5 text-right tabular-nums">
                {item.muted ? "—" : formatPrice(item.amountCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-6 flex justify-end">
        <div className="w-full space-y-1.5 text-sm sm:w-64">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">
              {formatPrice(totals.subtotalCents)}
            </span>
          </div>
          {Boolean(totals.discountCents) && (
            <div className="flex justify-between">
              <span>{discountLabel}</span>
              <span className="tabular-nums">
                -{formatPrice(totals.discountCents ?? 0)}
              </span>
            </div>
          )}
          {Boolean(totals.taxCents) && (
            <div className="flex justify-between">
              <span>{taxLabel}</span>
              <span className="tabular-nums">
                {formatPrice(totals.taxCents ?? 0)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-neutral-900 pt-1.5 text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">
              {formatPrice(totals.totalCents)}
            </span>
          </div>
          {Boolean(totals.amountPaidCents) && (
            <div className="flex justify-between font-medium">
              <span>Paid</span>
              <span className="tabular-nums">
                -{formatPrice(totals.amountPaidCents ?? 0)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-neutral-900 pt-1.5 font-bold">
            <span>Balance due</span>
            <span className="tabular-nums">
              {formatPrice(totals.balanceDueCents)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes / terms */}
      {(notes ?? terms) && (
        <section className="mt-8 grid grid-cols-1 gap-6 border-t border-neutral-200 pt-6 sm:grid-cols-2">
          {notes && (
            <div>
              <h2 className="mb-1.5 text-xs font-bold tracking-wide text-neutral-500 uppercase">
                Notes
              </h2>
              <p className="text-sm whitespace-pre-line text-neutral-700">
                {notes}
              </p>
            </div>
          )}
          {terms && (
            <div>
              <h2 className="mb-1.5 text-xs font-bold tracking-wide text-neutral-500 uppercase">
                Terms
              </h2>
              <p className="text-sm whitespace-pre-line text-neutral-700">
                {terms}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Payment instructions slot */}
      {paymentSlot && (
        <section className="mt-8 border-t border-neutral-200 pt-6 print:shadow-none">
          <h2 className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">
            How to pay
          </h2>
          {paymentSlot}
        </section>
      )}
    </div>
  );
}

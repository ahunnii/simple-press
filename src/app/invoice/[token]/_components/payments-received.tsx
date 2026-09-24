import type { PublicInvoiceView } from "~/lib/invoices/server-shared";
import { formatInvoiceDateLabel } from "~/lib/invoices/notify";
import { ymdToUtcMidnight } from "~/lib/invoices/status";
import { formatPrice } from "~/lib/prices";

type Props = {
  payments: PublicInvoiceView["payments"];
};

/**
 * "Payments received" — date, method, amount — shown under the invoice
 * document whenever at least one payment has been recorded. Server-safe, no
 * hooks; rendered as a plain sibling of `InvoiceDocument` rather than
 * threaded through one of its slots, since the document component only
 * exposes a single `paymentSlot` (used here for "how to pay", not "what's
 * been paid").
 */
export function PaymentsReceived({ payments }: Props) {
  if (payments.length === 0) return null;

  return (
    <section className="mt-8 border-t border-neutral-200 pt-6 print:break-inside-avoid">
      <h2 className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">
        Payments received
      </h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-neutral-500">
            <th className="py-1.5 pr-4 font-medium">Date</th>
            <th className="py-1.5 pr-4 font-medium">Method</th>
            <th className="py-1.5 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment, index) => (
            <tr key={index} className="border-b border-neutral-100">
              <td className="py-2 pr-4 text-neutral-700">
                {formatInvoiceDateLabel(ymdToUtcMidnight(payment.paidOn))}
              </td>
              <td className="py-2 pr-4 text-neutral-700">
                {payment.methodLabel}
              </td>
              <td className="py-2 text-right font-medium text-neutral-900 tabular-nums">
                {formatPrice(payment.amountCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

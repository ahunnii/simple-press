"use client";

import { ExternalLink } from "lucide-react";

import type { InvoicePaymentInstruction } from "~/lib/invoices/payment-methods";

import { CopyValueButton } from "./copy-value-button";

type Props = {
  instructions: InvoicePaymentInstruction[];
};

/** "Pay with Venmo" / "Pay with Cash App" / "Pay with PayPal" — falls back to a generic label for methods without a deep link. */
const PAY_WITH_LABEL: Partial<
  Record<InvoicePaymentInstruction["type"], string>
> = {
  venmo: "Pay with Venmo",
  cash_app: "Pay with Cash App",
  paypal: "Pay with PayPal",
};

/**
 * The customer-facing "How to pay" content on the hosted invoice page —
 * `InvoiceDocument`'s `paymentSlot`. One card per method the invoice was sent
 * with (the send-time snapshot, `PublicInvoiceView.paymentInstructions`),
 * each line with a copy button when the API marked it `copyable` (account and
 * routing numbers, handles, the invoice reference), and an external "Pay
 * with…" link when the method has one (Venmo, Cash App, PayPal.me).
 *
 * The caller (the page) is responsible for NOT rendering this at all when
 * `instructions` is empty — a cancelled or fully-paid invoice shows its own
 * message instead (see `page.tsx`).
 */
export function PaymentInstructions({ instructions }: Props) {
  if (instructions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {instructions.map((instruction) => (
        <div
          key={instruction.methodId}
          className="rounded-[var(--radius)] border border-neutral-200 p-4 print:break-inside-avoid"
        >
          <p className="mb-2 text-sm font-semibold text-neutral-900">
            {instruction.label}
          </p>
          <dl className="flex flex-col gap-2">
            {instruction.lines.map((line, index) => (
              <div
                key={`${line.label}-${index}`}
                className="flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <dt className="text-xs text-neutral-500">{line.label}</dt>
                  <dd className="min-w-0 text-sm font-medium break-words text-neutral-900">
                    {line.value}
                  </dd>
                </div>
                {line.copyable && (
                  <CopyValueButton value={line.value} label={line.label} />
                )}
              </div>
            ))}
          </dl>
          {instruction.url && (
            <a
              href={instruction.url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 underline underline-offset-2 print:hidden"
            >
              {PAY_WITH_LABEL[instruction.type] ?? "Open payment link"}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">(opens in new tab)</span>
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

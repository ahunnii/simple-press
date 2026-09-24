import type { InvoicePaymentInstruction } from "~/lib/invoices/payment-methods";

/**
 * Static (non-interactive) rendering of an invoice's payment instructions,
 * shared by the admin preview (`[id]/page.tsx`) and the print page
 * (`[id]/print/page.tsx`). Both are server components, so this has no copy
 * buttons or client state — unlike the hosted customer page, the owner is
 * looking at their own screen and can select-and-copy directly. The owner
 * sees every detail in full (no masking): only the customer-facing surfaces
 * mask or omit anything.
 */
export function PaymentInstructionsList({
  instructions,
}: {
  instructions: InvoicePaymentInstruction[];
}) {
  if (instructions.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No payment methods were attached to this invoice.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {instructions.map((instruction) => (
        <div key={instruction.methodId}>
          <p className="mb-1 text-sm font-semibold text-neutral-900">
            {instruction.label}
          </p>
          <dl className="space-y-0.5 text-sm text-neutral-600">
            {instruction.lines.map((line, index) => (
              <div key={index} className="flex gap-1.5">
                <dt className="shrink-0">{line.label}:</dt>
                <dd className="min-w-0 font-medium break-words text-neutral-800">
                  {line.value}
                </dd>
              </div>
            ))}
          </dl>
          {instruction.url && (
            <a
              href={instruction.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-blue-600 underline underline-offset-2"
            >
              Pay with {instruction.label}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

/** Draft copy for the "How to pay" section — no instructions exist yet. */
export function PaymentInstructionsPendingNotice() {
  return (
    <p className="text-sm text-neutral-500">
      Payment methods will be attached when this invoice is sent.
    </p>
  );
}

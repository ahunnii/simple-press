import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";

import type {
  InvoiceDocumentStatus,
  InvoiceDocumentTotals,
} from "~/components/invoices/invoice-document";
import type { PublicInvoiceView } from "~/lib/invoices/server-shared";
import type { QuickBooksBillingAddress } from "~/lib/validators/quickbooks";
import { checkBusiness } from "~/lib/check-business";
import { formatInvoiceDateLabel } from "~/lib/invoices/notify";
import { loadInvoiceForToken } from "~/lib/invoices/server-shared";
import { ymdToUtcMidnight } from "~/lib/invoices/status";
import { recordInvoiceView } from "~/lib/invoices/views";
import { getClientIpFromHeaders, invoiceViewLimiter } from "~/lib/rate-limit";
import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";
import { InvoiceDocument } from "~/components/invoices/invoice-document";

import { PaymentInstructions } from "./_components/payment-instructions";
import { PaymentsReceived } from "./_components/payments-received";
import { PrintButton } from "./_components/print-button";

type Props = {
  params: Promise<{ token: string }>;
};

// ─── Small pure helpers ─────────────────────────────────────────────────────

/** "6.25" / "10" — trims the basis-point→percent conversion to a clean string, no trailing zeros. */
function bpsToPercentLabel(bps: number): string {
  return Number((bps / 100).toFixed(2)).toString();
}

function dateLabel(ymd: string | null): string | undefined {
  return ymd ? formatInvoiceDateLabel(ymdToUtcMidnight(ymd)) : undefined;
}

/**
 * The address to point an expired-link customer at: support email, else the
 * owner's, else `null` (the card omits the "at <email>" clause entirely).
 * Blank strings are treated the same as missing — `??` alone would keep an
 * empty `supportEmail` rather than falling through to `ownerEmail`.
 */
function resolveContactEmail(
  business: { supportEmail: string | null; ownerEmail: string } | null,
): string | null {
  const supportEmail = business?.supportEmail?.trim();
  if (supportEmail) return supportEmail;
  const ownerEmail = business?.ownerEmail?.trim();
  if (ownerEmail) return ownerEmail;
  return null;
}

function billToAddressLines(
  address: QuickBooksBillingAddress | null,
): string[] | undefined {
  if (!address) return undefined;
  return [
    address.line1,
    ...(address.line2 ? [address.line2] : []),
    `${address.city}, ${address.state} ${address.zip}`,
  ];
}

/**
 * The status pill shown next to the invoice number. Priority: a cancelled
 * invoice reads "Cancelled" no matter what it owed; a paid one reads "Paid ✓"
 * even past its due date; `isOverdue` (SENT/PARTIALLY_PAID past its due date
 * in the business's zone — already computed by `loadInvoiceForToken`) beats
 * "Partially paid"; a plain open invoice with time left reads "Awaiting
 * payment" (the due date itself already lives in the dates block above).
 */
function resolveStatusPill(invoice: PublicInvoiceView): InvoiceDocumentStatus {
  if (invoice.status === "CANCELLED") {
    return { label: "Cancelled", tone: "neutral" };
  }
  if (invoice.status === "PAID") {
    return { label: "Paid ✓", tone: "success" };
  }
  if (invoice.isOverdue) {
    return { label: "Overdue", tone: "danger" };
  }
  if (invoice.status === "PARTIALLY_PAID") {
    return { label: "Partially paid", tone: "warning" };
  }
  // The due date is already shown in the dates block above the pill, so this
  // doesn't repeat it — see the plan's polish note on the hosted page.
  return { label: "Awaiting payment", tone: "neutral" };
}

function resolveTotals(invoice: PublicInvoiceView): InvoiceDocumentTotals {
  return {
    subtotalCents: invoice.subtotalCents,
    discountCents: invoice.discountCents,
    discountLabel:
      invoice.discountType === "percent"
        ? `Discount (${bpsToPercentLabel(invoice.discountValue)}%)`
        : "Discount",
    taxCents: invoice.taxCents,
    taxRateLabel:
      invoice.taxRateBps > 0
        ? `${bpsToPercentLabel(invoice.taxRateBps)}%`
        : undefined,
    totalCents: invoice.totalCents,
    amountPaidCents: invoice.amountPaidCents,
    balanceDueCents: invoice.balanceCents,
  };
}

/**
 * "How to pay" content. `paymentInstructions` is empty exactly when the
 * invoice is cancelled or nothing is owed (see `PublicInvoiceView`'s
 * docblock), so those two states get their own message instead of an empty
 * "How to pay" section.
 */
function resolvePaymentSlot(invoice: PublicInvoiceView): ReactNode {
  if (invoice.status === "CANCELLED") {
    return (
      <p className="text-sm text-neutral-600">This invoice was cancelled.</p>
    );
  }
  if (invoice.paymentInstructions.length === 0) {
    return (
      <p className="text-sm font-medium text-emerald-700">
        Paid in full — thank you.
      </p>
    );
  }
  return <PaymentInstructions instructions={invoice.paymentInstructions} />;
}

// ─── Friendly non-happy-path states ─────────────────────────────────────────

function ExpiredState({
  businessName,
  contactEmail,
}: {
  businessName: string;
  contactEmail: string | null;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 sm:py-24">
      <div className="border-border rounded-[var(--radius)] border p-8 text-center sm:p-12">
        <h1 className="mb-3 text-2xl font-medium tracking-tight">
          This invoice link has expired
        </h1>
        <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
          Contact {businessName} for a new one
          {contactEmail ? (
            <>
              {" "}
              at{" "}
              <a
                href={`mailto:${contactEmail}`}
                className="text-foreground border-b border-current pb-0.5 font-medium"
              >
                {contactEmail}
              </a>
            </>
          ) : null}
          .
        </p>
      </div>
    </main>
  );
}

function RateLimitedState() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 sm:py-24">
      <div className="border-border rounded-[var(--radius)] border p-8 text-center sm:p-12">
        <h1 className="mb-3 text-2xl font-medium tracking-tight">
          Too many requests
        </h1>
        <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
          Please wait a minute and reload this page.
        </p>
      </div>
    </main>
  );
}

// ─── Metadata ────────────────────────────────────────────────────────────────

/**
 * Uses `loadInvoiceForToken` directly (not the rate-limited `getByToken`
 * tRPC procedure) — it's a side-effect-free read, so building the title
 * costs nothing extra against the 60-per-15-minutes limiter and doesn't
 * stamp a second "viewed" event.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);

  const business = await checkBusiness();
  if (!business) {
    return { robots: { index: false, follow: false } };
  }

  const result = await loadInvoiceForToken(db, {
    token,
    businessId: business.id,
  });

  const title =
    result.state === "ok"
      ? `Invoice ${result.invoice.displayNumber} · ${business.name}`
      : `Invoice · ${business.name}`;

  return {
    // `{ absolute }` opts out of the root layout's `%s | <brand>` title
    // template (see `~/lib/seo.ts`'s `buildPageMetadata`, which ships the
    // same shape) — this title already carries the business name, so the
    // template would otherwise append it a second time.
    title: { absolute: title },
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

/**
 * The hosted, no-login invoice page (plan: "customer-facing" §hosted page).
 * Deliberately OUTSIDE the `(storefront)` route group: it must keep working
 * while the store is in maintenance/coming-soon mode, and it prints cleanly
 * with no storefront chrome (nav, cart, footer). The root layout
 * (`src/app/layout.tsx`) still wraps it, so fonts/theme/toasts all work.
 *
 * Security shape mirrors `(storefront)/subscriptions/[token]/page.tsx`:
 * - No `checkBusiness()` match → 404 (never leak that any tenant exists).
 * - `loadInvoiceForToken` re-derives everything from the HOST-resolved
 *   business id, never from the token itself, so a token minted for store A
 *   can't be replayed against store B's host.
 * - `state: "not_found"` (bad signature, cross-tenant token, missing row, or
 *   a draft) → 404. `state: "expired"` (validly-signed, past its 365-day
 *   TTL) → a friendly recovery card, since the customer had a genuine link.
 * - Rate limited (60 / 15 min per IP+host) → a "too many requests" card, not
 *   the error boundary — a throttle must not read as "this store is broken"
 *   on the one page a customer needs to see what they owe.
 */
export default async function InvoiceHostedPage({ params }: Props) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);

  const business = await checkBusiness();
  if (!business) notFound();

  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const ip = getClientIpFromHeaders(headersList);

  try {
    await invoiceViewLimiter.consume(`${ip}:${host}`);
  } catch {
    return <RateLimitedState />;
  }

  const result = await loadInvoiceForToken(db, {
    token,
    businessId: business.id,
  });
  if (result.state === "not_found") notFound();

  if (result.state === "expired") {
    const contact = await db.business.findUnique({
      where: { id: business.id },
      select: { supportEmail: true, ownerEmail: true },
    });
    const contactEmail = resolveContactEmail(contact);
    return (
      <ExpiredState businessName={business.name} contactEmail={contactEmail} />
    );
  }

  const { invoice } = result;

  // Never let a session lookup failure take down the one page a customer
  // needs to see what they owe — an anonymous view is still a valid view.
  const session = await getSession().catch(() => null);

  after(() =>
    recordInvoiceView(db, {
      invoiceId: invoice.id,
      businessId: business.id,
      viewerUserId: session?.user?.id ?? null,
    }),
  );

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6 sm:py-12 print:bg-white print:p-0">
      {/* `@page` margin only affects the printed sheet; harmless elsewhere. */}
      <style>{`@media print { @page { margin: 0.75in; } }`}</style>

      <div className="mx-auto w-full max-w-[880px]">
        <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            {invoice.issuer.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={invoice.issuer.logoUrl}
                alt=""
                className="h-8 w-auto object-contain"
              />
            ) : null}
            <span className="truncate text-sm font-medium text-neutral-900">
              {invoice.issuer.name}
            </span>
          </div>
          <PrintButton />
        </div>

        <div className="rounded-[var(--radius)] border border-neutral-200 bg-white p-6 shadow-sm sm:p-10 print:border-0 print:p-0 print:shadow-none">
          <InvoiceDocument
            invoiceNumber={invoice.displayNumber}
            status={resolveStatusPill(invoice)}
            issueDateLabel={dateLabel(invoice.issueDate)}
            dueDateLabel={dateLabel(invoice.dueDate)}
            issuer={{
              businessName: invoice.issuer.name,
              logoUrl: invoice.issuer.logoUrl,
              addressLines: invoice.issuer.addressLines,
              email: invoice.issuer.email,
              phone: invoice.issuer.phone,
            }}
            billTo={{
              name: invoice.billTo.name,
              email: invoice.billTo.email,
              phone: invoice.billTo.phone,
              addressLines: billToAddressLines(invoice.billTo.address),
            }}
            lineItems={invoice.lineItems}
            totals={resolveTotals(invoice)}
            notes={invoice.notes ?? undefined}
            terms={invoice.terms ?? undefined}
            paymentSlot={resolvePaymentSlot(invoice)}
            accentColor={invoice.issuer.accentColor ?? undefined}
          />
          <PaymentsReceived payments={invoice.payments} />
        </div>
      </div>
    </main>
  );
}

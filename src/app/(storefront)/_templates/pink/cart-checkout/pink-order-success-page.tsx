import { Suspense } from "react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { getSession } from "~/server/better-auth/server";

import { resolveFields } from "..";
import { PinkOrderConfirmation } from "./pink-order-confirmation";

type Props = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

/** Trimmed value, or `undefined` when blank — so `??` skips a cleared column. */
function nonBlank(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed?.length ? trimmed : undefined;
}

function PinkOrderLoadingFallback({ loadingText }: { loadingText: string }) {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center px-5 py-24 md:px-10"
      style={{ background: "var(--pink-paper)" }}
    >
      <p
        role="status"
        aria-live="polite"
        className="text-[16px]"
        style={{ color: "var(--pink-subtle)" }}
      >
        {loadingText || "Confirming your order…"}
      </p>
    </div>
  );
}

/**
 * Order success — design.md → "Order success [extrapolated]": reuses the
 * checkout's paper item-list + ink summary-panel inversion so the whole
 * cart → checkout → success flow reads as one thing. Group
 * `checkout.success`, not hideable — see `order-fields.ts` for why the ink
 * panel shows order total / email / payment status rather than a shipping
 * address. Pickup orders (`delivery_method` from `/api/stripe/session`) get
 * the pickup copy plus the Settings pickup location (falling back to the
 * business address) and instructions.
 */
export async function PinkOrderSuccessPage({ business }: Props) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "pink.order.heading",
    "pink.order.heading-accent",
    "pink.order.body",
    "pink.order.pickup-body",
    "pink.order.items-heading",
    "pink.order.summary-heading",
    "pink.checkout.next-steps-label",
    "pink.order.next-steps",
    "pink.order.next-steps-pickup",
    "pink.checkout.success-note",
    "pink.order.receipt-note",
    "pink.order.continue-cta",
    "pink.order.loading-text",
    "pink.order.no-order-heading",
    "pink.order.no-order-body",
    "pink.order.no-order-cta",
    "pink.order.cta-heading",
    "pink.order.cta-body",
    "pink.order.cta-button",
    "pink.order.cta-link",
    "pink.order.cta-secondary-label",
    "pink.order.cta-secondary-link",
  ]);

  const pickupLocation =
    nonBlank(business?.pickupLocation) ??
    nonBlank(business?.businessAddress) ??
    "";
  const pickupInstructions = nonBlank(business?.pickupInstructions) ?? "";

  const loadingText = f["pink.order.loading-text"] ?? "Confirming your order…";

  // PF16 / B9.4 (P-ORDER-CTA) — resolved server-side so the account CTA is
  // correct on the first paint; see the doc on `PinkOrderConfirmation`'s
  // `initialSession` prop.
  const initialSession = await getSession().catch(() => null);

  return (
    <Suspense fallback={<PinkOrderLoadingFallback loadingText={loadingText} />}>
      <PinkOrderConfirmation
        heading={f["pink.order.heading"] ?? ""}
        headingAccent={f["pink.order.heading-accent"] ?? ""}
        body={f["pink.order.body"] ?? ""}
        pickupBody={f["pink.order.pickup-body"] ?? ""}
        itemsHeading={f["pink.order.items-heading"] ?? ""}
        summaryHeading={f["pink.order.summary-heading"] ?? ""}
        nextStepsLabel={f["pink.checkout.next-steps-label"] ?? ""}
        nextSteps={f["pink.order.next-steps"] ?? ""}
        nextStepsPickup={f["pink.order.next-steps-pickup"] ?? ""}
        successNote={f["pink.checkout.success-note"] ?? ""}
        receiptNote={f["pink.order.receipt-note"] ?? ""}
        pickupLocation={pickupLocation}
        pickupInstructions={pickupInstructions}
        continueCta={f["pink.order.continue-cta"] ?? ""}
        loadingText={loadingText}
        noOrderHeading={f["pink.order.no-order-heading"] ?? ""}
        noOrderBody={f["pink.order.no-order-body"] ?? ""}
        noOrderCta={f["pink.order.no-order-cta"] ?? ""}
        ctaHeading={f["pink.order.cta-heading"] ?? ""}
        ctaBody={f["pink.order.cta-body"] ?? ""}
        ctaButton={f["pink.order.cta-button"] ?? ""}
        ctaLink={f["pink.order.cta-link"] ?? ""}
        ctaSecondaryLabel={f["pink.order.cta-secondary-label"] ?? ""}
        ctaSecondaryLink={f["pink.order.cta-secondary-link"] ?? ""}
        initialSession={initialSession}
      />
    </Suspense>
  );
}

import { Suspense } from "react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";

import { resolveFields } from "..";
import { PinkOrderConfirmation } from "./pink-order-confirmation";

type Props = {
  business: DefaultCheckoutPageTemplateProps["business"];
};

function PinkOrderLoadingFallback({ loadingText }: { loadingText: string }) {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center px-5 py-24 md:px-10"
      style={{ background: "var(--pink-paper)" }}
    >
      <p role="status" aria-live="polite" className="text-[16px]" style={{ color: "var(--pink-subtle)" }}>
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
 * panel shows order total / email / payment status rather than shipping
 * address / delivery method (that data isn't available from
 * `/api/stripe/session`, only from server-side order records this route
 * doesn't have access to).
 */
export function PinkOrderSuccessPage({ business }: Props) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "pink.order.eyebrow",
    "pink.order.heading",
    "pink.order.heading-accent",
    "pink.order.body",
    "pink.order.items-heading",
    "pink.order.summary-heading",
    "pink.order.next-steps",
    "pink.order.continue-cta",
    "pink.order.loading-text",
    "pink.order.no-order-heading",
    "pink.order.no-order-body",
    "pink.order.no-order-cta",
    "pink.order.cta-eyebrow",
    "pink.order.cta-heading",
    "pink.order.cta-body",
    "pink.order.cta-button",
    "pink.order.cta-link",
    "pink.order.cta-secondary-label",
    "pink.order.cta-secondary-link",
  ]);

  const loadingText = f["pink.order.loading-text"] ?? "Confirming your order…";

  return (
    <Suspense fallback={<PinkOrderLoadingFallback loadingText={loadingText} />}>
      <PinkOrderConfirmation
        eyebrow={f["pink.order.eyebrow"] ?? ""}
        heading={f["pink.order.heading"] ?? ""}
        headingAccent={f["pink.order.heading-accent"] ?? ""}
        body={f["pink.order.body"] ?? ""}
        itemsHeading={f["pink.order.items-heading"] ?? ""}
        summaryHeading={f["pink.order.summary-heading"] ?? ""}
        nextSteps={f["pink.order.next-steps"] ?? ""}
        continueCta={f["pink.order.continue-cta"] ?? ""}
        loadingText={loadingText}
        noOrderHeading={f["pink.order.no-order-heading"] ?? ""}
        noOrderBody={f["pink.order.no-order-body"] ?? ""}
        noOrderCta={f["pink.order.no-order-cta"] ?? ""}
        ctaEyebrow={f["pink.order.cta-eyebrow"] ?? ""}
        ctaHeading={f["pink.order.cta-heading"] ?? ""}
        ctaBody={f["pink.order.cta-body"] ?? ""}
        ctaButton={f["pink.order.cta-button"] ?? ""}
        ctaLink={f["pink.order.cta-link"] ?? "/shop"}
        ctaSecondaryLabel={f["pink.order.cta-secondary-label"] ?? ""}
        ctaSecondaryLink={f["pink.order.cta-secondary-link"] ?? "/services"}
      />
    </Suspense>
  );
}

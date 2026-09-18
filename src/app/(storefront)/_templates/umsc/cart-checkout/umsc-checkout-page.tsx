import Link from "next/link";

import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { fieldAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { UmscCheckoutForm } from "./umsc-checkout-form";
import { UmscCheckoutUnavailable } from "./umsc-checkout-unavailable";

/**
 * UmscCheckoutPage — Operate mode: no scroll reveals. Belt-and-suspenders
 * guard mirrors `checkout/page.tsx`'s route-level check (that route already
 * renders `t.CheckoutUnavailable` before this page is ever reached; this
 * inline fallback only matters if something ever calls this component
 * directly, following vii/olive's defensive precedent).
 */
export async function UmscCheckoutPage({
  business,
  merchantPolicies,
}: DefaultCheckoutPageTemplateProps) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "umsc.checkout.heading",
    "umsc.checkout.contact-heading",
    "umsc.checkout.delivery-heading",
    "umsc.checkout.shipping-heading",
    "umsc.checkout.summary-heading",
    "umsc.checkout.discount-label",
    "umsc.checkout.submit-label",
    "umsc.checkout.empty-heading",
    "umsc.checkout.empty-cta",
  ]);

  if (!business.isStripeConnected && process.env.NODE_ENV !== "development") {
    return (
      <UmscCheckoutUnavailable
        business={business}
        customFields={customFields}
      />
    );
  }

  return (
    <div className="bg-[var(--umsc-paper)]">
      <div className="border-b border-[var(--umsc-line)] bg-[var(--umsc-cream)] px-6 py-8 sm:px-8">
        <div
          className="mx-auto flex flex-wrap items-baseline justify-between gap-4"
          style={{ maxWidth: "var(--umsc-container)" }}
        >
          <h1
            {...fieldAttr("umsc.checkout.heading")}
            className="umsc-serif text-[clamp(28px,3.6vw,40px)] font-normal text-[var(--umsc-ink)]"
          >
            {f["umsc.checkout.heading"] ?? ""}
          </h1>
          <Link
            href="/cart"
            className="umsc-sans text-[13px] text-[var(--umsc-muted)] hover:text-[var(--umsc-ink)]"
          >
            <span aria-hidden="true">←</span> Back to cart
          </Link>
        </div>
      </div>

      <div
        className="mx-auto px-6 py-12 sm:px-8 sm:py-16"
        style={{ maxWidth: "var(--umsc-container)" }}
      >
        <UmscCheckoutForm
          business={business}
          merchantPolicies={merchantPolicies}
          contactHeading={f["umsc.checkout.contact-heading"] ?? ""}
          deliveryHeading={f["umsc.checkout.delivery-heading"] ?? ""}
          shippingHeading={f["umsc.checkout.shipping-heading"] ?? ""}
          summaryHeading={f["umsc.checkout.summary-heading"] ?? ""}
          discountLabel={f["umsc.checkout.discount-label"] ?? ""}
          submitLabel={f["umsc.checkout.submit-label"] ?? ""}
          emptyHeading={f["umsc.checkout.empty-heading"] ?? ""}
          emptyCta={f["umsc.checkout.empty-cta"] ?? ""}
        />
      </div>
    </div>
  );
}

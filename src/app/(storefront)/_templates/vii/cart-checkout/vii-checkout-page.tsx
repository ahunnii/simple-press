import Link from "next/link";

import type { DefaultCheckoutPageTemplateProps } from "../../types";

import { resolveFields } from "..";
import { ViiReveal } from "../shared/vii-reveal";
import { ViiCheckoutForm } from "./vii-checkout-form";
import { ViiCheckoutUnavailable } from "./vii-checkout-unavailable";

/**
 * `checkout/page.tsx` already renders `t.CheckoutUnavailable` (no props)
 * when the store has no Stripe account outside development — see the guard
 * there. This guard is belt-and-suspenders for any caller that reaches this
 * component anyway, and hands the already-loaded `customFields` down so the
 * unavailable screen doesn't have to re-fetch the tenant.
 */
export async function ViiCheckoutPage({
  business,
  merchantPolicies,
}: DefaultCheckoutPageTemplateProps) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "vii.checkout.heading",
    "vii.checkout.contact-overline",
    "vii.checkout.contact-heading",
    "vii.checkout.delivery-overline",
    "vii.checkout.delivery-heading",
    "vii.checkout.shipping-overline",
    "vii.checkout.shipping-heading",
    "vii.checkout.summary-overline",
    "vii.checkout.summary-heading",
    "vii.checkout.submit-label",
    "vii.checkout.empty-heading",
    "vii.checkout.empty-cta",
  ]);

  // Guard: Stripe not yet connected outside dev
  if (!business.isStripeConnected && process.env.NODE_ENV !== "development") {
    return <ViiCheckoutUnavailable customFields={customFields} />;
  }

  return (
    <div style={{ background: "var(--vii-cream)", minHeight: "100vh" }}>
      {/* Checkout header band */}
      <div
        style={{
          background: "var(--vii-cream)",
          borderBottom: "1px solid var(--vii-hairline)",
          padding:
            "clamp(184px, 17vw, 232px) clamp(24px, 6vw, 96px) clamp(28px, 3vw, 40px)",
        }}
      >
        <ViiReveal
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(26px, 3.5vw, 38px)",
              fontWeight: 500,
              color: "var(--vii-navy)",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {f["vii.checkout.heading"] ?? "Checkout"}
          </h1>

          <Link
            href="/cart"
            className="vii-nav-link"
            style={{
              position: "relative",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              letterSpacing: "0.04em",
              color: "var(--vii-ink-soft)",
              textDecoration: "none",
              transition: "color 0.15s ease",
              flexShrink: 0,
            }}
          >
            <span aria-hidden="true">←</span> Back to cart
          </Link>
        </ViiReveal>
      </div>

      {/* Form area */}
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding:
            "clamp(40px, 5vw, 64px) clamp(24px, 6vw, 96px) clamp(64px, 8vw, 96px)",
        }}
      >
        <ViiCheckoutForm
          business={business}
          merchantPolicies={merchantPolicies}
          contactOverline={f["vii.checkout.contact-overline"] ?? ""}
          contactHeading={f["vii.checkout.contact-heading"] ?? ""}
          deliveryOverline={f["vii.checkout.delivery-overline"] ?? ""}
          deliveryHeading={f["vii.checkout.delivery-heading"] ?? ""}
          shippingOverline={f["vii.checkout.shipping-overline"] ?? ""}
          shippingHeading={f["vii.checkout.shipping-heading"] ?? ""}
          summaryOverline={f["vii.checkout.summary-overline"] ?? ""}
          summaryHeading={f["vii.checkout.summary-heading"] ?? ""}
          submitLabel={f["vii.checkout.submit-label"] ?? ""}
          emptyHeading={f["vii.checkout.empty-heading"] ?? ""}
          emptyCta={f["vii.checkout.empty-cta"] ?? ""}
        />
      </div>
    </div>
  );
}

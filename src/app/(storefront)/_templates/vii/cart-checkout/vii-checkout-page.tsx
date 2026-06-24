import Link from "next/link";

import type { DefaultCheckoutPageTemplateProps } from "../../types";

import { resolveFields } from "..";
import { ViiReveal } from "../shared/vii-reveal";
import { ViiCheckoutForm } from "./vii-checkout-form";

export async function ViiCheckoutPage({
  business,
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
    return (
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding:
            "clamp(144px, 14vw, 188px) clamp(24px, 6vw, 96px) clamp(64px, 10vw, 120px)",
          background: "var(--vii-cream)",
          minHeight: "60vh",
        }}
      >
        <ViiReveal style={{ maxWidth: 480, textAlign: "center" }}>
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: 32,
              height: 2,
              background: "var(--vii-copper)",
              marginBottom: 32,
            }}
          />
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(24px, 4vw, 36px)",
              fontWeight: 500,
              color: "var(--vii-navy)",
              marginBottom: 20,
            }}
          >
            {f["vii.checkout.heading"] ?? "Checkout"}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              lineHeight: 1.6,
              letterSpacing: "0.02em",
              color: "var(--vii-ink-soft)",
              marginBottom: 40,
            }}
          >
            This store hasn&apos;t set up payment processing yet. Please contact
            the store owner.
          </p>
          <Link
            href="/shop"
            className="vii-cta-btn"
            style={{
              position: "relative",
              overflow: "hidden",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 32px",
              background: "var(--vii-copper-deep)",
              color: "var(--vii-paper)",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              borderRadius: "var(--radius)",
              textDecoration: "none",
            }}
          >
            Back to shop
          </Link>
        </ViiReveal>
      </div>
    );
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

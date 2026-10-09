import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { GloveSection } from "../shared/glove-section";
import { GLOVE_STEP_FIELD_LIST } from "./checkout-fields";
import { GloveCheckoutForm } from "./glove-checkout-form";
import { GloveCheckoutSteps } from "./glove-checkout-steps";
import { GloveCheckoutUnavailable } from "./glove-checkout-unavailable";

/**
 * Checkout page: progress band (step 2) over the billing form and "Your
 * order" card. `checkout/page.tsx` already renders `t.CheckoutUnavailable`
 * outside development when the store has no Stripe account; this guard covers
 * any other caller and hands the loaded `customFields` down.
 */
export function GloveCheckoutPage({
  business,
  merchantPolicies,
}: DefaultCheckoutPageTemplateProps) {
  if (!business.isStripeConnected && process.env.NODE_ENV !== "development") {
    return (
      <GloveCheckoutUnavailable
        customFields={business.siteContent?.customFields}
      />
    );
  }

  const f = resolveFields(business.siteContent?.customFields, [
    ...GLOVE_STEP_FIELD_LIST,
    "glove.checkout.details-heading",
    "glove.checkout.delivery-heading",
    "glove.checkout.shipping-heading",
    "glove.checkout.discount-heading",
    "glove.checkout.summary-heading",
    "glove.checkout.submit-label",
    "glove.checkout.tax-note",
    "glove.checkout.secure-note",
    "glove.checkout.empty-heading",
    "glove.checkout.empty-cta",
  ]);

  const checkoutLabel = f["glove.checkout.step-checkout"] ?? "";

  return (
    <>
      <GloveCheckoutSteps
        current={2}
        heading={checkoutLabel}
        labels={{
          cart: f["glove.checkout.step-cart"] ?? "",
          checkout: checkoutLabel,
          complete: f["glove.checkout.step-complete"] ?? "",
        }}
      />
      {/* The form is never inside a reveal. */}
      <GloveSection
        reveal={false}
        sectionAttrs={sectionGroupAttr("checkout", "main")}
        aria-label="Checkout"
      >
        <GloveCheckoutForm
          business={business}
          merchantPolicies={merchantPolicies}
          detailsHeading={f["glove.checkout.details-heading"] ?? ""}
          deliveryHeading={f["glove.checkout.delivery-heading"] ?? ""}
          shippingHeading={f["glove.checkout.shipping-heading"] ?? ""}
          discountHeading={f["glove.checkout.discount-heading"] ?? ""}
          summaryHeading={f["glove.checkout.summary-heading"] ?? ""}
          submitLabel={f["glove.checkout.submit-label"] ?? ""}
          taxNote={f["glove.checkout.tax-note"] ?? ""}
          secureNote={f["glove.checkout.secure-note"] ?? ""}
          emptyHeading={f["glove.checkout.empty-heading"] ?? ""}
          emptyCta={f["glove.checkout.empty-cta"] ?? ""}
        />
      </GloveSection>
    </>
  );
}

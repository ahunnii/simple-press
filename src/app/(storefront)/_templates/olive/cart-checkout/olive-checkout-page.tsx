import type { DefaultCheckoutPageTemplateProps } from "../../types";

import { OliveCheckoutForm } from "./olive-checkout-form";
import { OliveCheckoutUnavailable } from "./olive-checkout-unavailable";

/**
 * Checkout page — design.md → "Per-page section concepts → CheckoutPage".
 *
 * `checkout/page.tsx` already renders `t.CheckoutUnavailable` when the store
 * has no Stripe account outside development, so this component normally has
 * a usable one; the guard below is belt-and-suspenders for any caller that
 * reaches it anyway, and it hands the already-loaded `customFields` down so
 * the unavailable card does not have to re-read the tenant.
 *
 * Both hotspots (`checkout.main` on the form column, `checkout.summary` on
 * the bag aside) live inside `OliveCheckoutForm` on their own section roots:
 * nesting them under one wrapper here would make the bag card a child of the
 * form's hotspot, and the form owns its own `resolveFields` call so its
 * exported shape matches every other template's checkout form.
 */
export function OliveCheckoutPage({
  business,
  merchantPolicies,
}: DefaultCheckoutPageTemplateProps) {
  if (!business.isStripeConnected && process.env.NODE_ENV !== "development") {
    return (
      <OliveCheckoutUnavailable
        customFields={business.siteContent?.customFields}
      />
    );
  }

  return (
    <OliveCheckoutForm
      business={business}
      merchantPolicies={merchantPolicies}
    />
  );
}

import type { DefaultCheckoutPageTemplateProps } from "../../types";

import { DarkTrendGeneralLayout } from "../layout/dark-trend-general-layout";
import { DarkTrendCheckoutForm } from "./dark-trend-checkout-form";
import { DarkTrendCheckoutUnavailable } from "./dark-trend-checkout-unavailable";

/**
 * `checkout/page.tsx` already renders `t.CheckoutUnavailable` (no props)
 * when the store has no Stripe account outside development. This guard is
 * belt-and-suspenders for any caller that reaches this component anyway
 * (same development bypass as the route and bamboo's `BambooCheckoutPage`),
 * and hands the already-loaded `customFields` down so the unavailable screen
 * doesn't have to re-fetch the tenant.
 */
export async function DarkTrendCheckoutPage({
  business,
  merchantPolicies,
}: DefaultCheckoutPageTemplateProps) {
  if (!business.isStripeConnected && process.env.NODE_ENV !== "development") {
    return (
      <DarkTrendCheckoutUnavailable
        customFields={business.siteContent?.customFields}
      />
    );
  }

  return (
    <DarkTrendGeneralLayout title="Checkout">
      <DarkTrendCheckoutForm
        business={business}
        merchantPolicies={merchantPolicies}
      />
    </DarkTrendGeneralLayout>
  );
}

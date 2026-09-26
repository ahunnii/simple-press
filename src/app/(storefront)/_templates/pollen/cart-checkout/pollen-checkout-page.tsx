import type { DefaultCheckoutPageTemplateProps } from "../../types";

import { PollenGeneralLayout } from "../layout/pollen-general-layout";
import { PollenCheckoutForm } from "./pollen-checkout-form";
import { PollenCheckoutUnavailable } from "./pollen-checkout-unavailable";

/**
 * `checkout/page.tsx` already renders `t.CheckoutUnavailable` (no props)
 * when the store has no Stripe account outside development — see the guard
 * there at `src/app/(storefront)/checkout/page.tsx:16-17`. That guard is
 * skipped in development, so this stays as belt-and-suspenders for any
 * caller (including local dev) that reaches this component without Stripe
 * connected, and hands the already-loaded `customFields` down so the
 * unavailable screen doesn't have to re-fetch the tenant.
 */
export async function PollenCheckoutPage({
  business,
  merchantPolicies,
}: DefaultCheckoutPageTemplateProps) {
  if (!business.isStripeConnected) {
    return (
      <PollenCheckoutUnavailable
        customFields={business.siteContent?.customFields}
      />
    );
  }

  return (
    <PollenGeneralLayout
      business={business}
      title="Checkout"
      subtitle="Complete Your Order"
      showCTA={false}
    >
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <PollenCheckoutForm
          business={business}
          merchantPolicies={merchantPolicies}
        />
      </section>
    </PollenGeneralLayout>
  );
}

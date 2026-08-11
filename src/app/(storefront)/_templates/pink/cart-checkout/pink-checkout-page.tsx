import type { DefaultCheckoutPageTemplateProps } from "../../types";

import { PinkCheckoutForm } from "./pink-checkout-form";

/**
 * Checkout page — design.md → "Per-page section concepts → Checkout". The
 * route (`checkout/page.tsx`) already guards against Stripe not being
 * connected and renders `t.CheckoutUnavailable` instead, so this component
 * always has a usable Stripe account. All copy resolution and layout lives
 * in `PinkCheckoutForm`, which also owns its own `resolveFields` call so its
 * exported shape matches every other template's checkout form component.
 *
 * Both `checkout.main` and `checkout.summary` hotspots are rendered inside
 * `PinkCheckoutForm` directly on their own section roots (the form column
 * and the basket aside) rather than on this page shell — nesting both under
 * one outer `data-sp-group` here would make the hideable `checkout.summary`
 * aside a child of `checkout.main`'s hotspot instead of its own.
 */
export async function PinkCheckoutPage({
  business,
  merchantPolicies,
}: DefaultCheckoutPageTemplateProps) {
  return (
    <div
      className="px-5 py-16 md:px-10 md:py-20"
      style={{ background: "var(--pink-paper)" }}
    >
      <div className="mx-auto max-w-[1400px]">
        <PinkCheckoutForm
          business={business}
          merchantPolicies={merchantPolicies}
        />
      </div>
    </div>
  );
}

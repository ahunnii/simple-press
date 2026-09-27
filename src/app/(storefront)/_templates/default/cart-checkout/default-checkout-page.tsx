import Link from "next/link";

import type { DefaultCheckoutPageTemplateProps } from "../../types";

import { DefaultCheckoutForm } from "./default-checkout-form";
import { DefaultCheckoutUnavailable } from "./default-checkout-unavailable";

export async function DefaultCheckoutPage({
  business,
  merchantPolicies,
}: DefaultCheckoutPageTemplateProps) {
  // Unreachable through `checkout/page.tsx`, which applies this exact guard
  // first and renders `t.CheckoutUnavailable` itself. Kept as a safety net
  // for any future direct caller, delegating to the same component so the
  // owner's `default.checkout.unavailable-*` copy is the single source.
  if (!business.isStripeConnected && process.env.NODE_ENV !== "development") {
    return (
      <DefaultCheckoutUnavailable
        customFields={business.siteContent?.customFields}
      />
    );
  }

  return (
    <div>
      {/* Minimal checkout header */}
      <div className="border-b border-[#e8e8e8] px-6 py-5 lg:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between">
          <h1 className="font-serif text-xl font-medium tracking-tight">
            Checkout
          </h1>
          <Link
            href="/cart"
            className="text-sm text-[#6b6b6b] transition-colors hover:text-[#0a0a0a]"
          >
            <span aria-hidden="true">←</span> Back to cart
          </Link>
        </div>
      </div>

      <div className="px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <DefaultCheckoutForm
            business={business}
            merchantPolicies={merchantPolicies}
          />
        </div>
      </div>
    </div>
  );
}

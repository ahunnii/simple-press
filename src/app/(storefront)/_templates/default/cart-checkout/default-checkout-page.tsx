import Link from "next/link";

import type { DefaultCheckoutPageTemplateProps } from "../../types";

import { DefaultCheckoutForm } from "./default-checkout-form";

export async function DefaultCheckoutPage({
  business,
  merchantPolicies,
}: DefaultCheckoutPageTemplateProps) {
  if (!business.isStripeConnected && process.env.NODE_ENV !== "development") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-2xl font-medium">
            Checkout unavailable
          </h1>
          <p className="mt-3 text-sm text-[#6b6b6b]">
            This store hasn&apos;t set up payment processing yet. Please contact
            the store owner.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-[var(--radius)] bg-[#0a0a0a] px-8 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a]"
          >
            Back to shop
          </Link>
        </div>
      </div>
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

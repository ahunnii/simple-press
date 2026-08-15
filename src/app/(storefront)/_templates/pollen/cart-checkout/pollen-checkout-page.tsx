import Link from "next/link";

import type { DefaultCheckoutPageTemplateProps } from "../../types";

import { PollenGeneralLayout } from "../layout/pollen-general-layout";
import { PollenCheckoutForm } from "./pollen-checkout-form";

export async function PollenCheckoutPage({
  business,
  merchantPolicies,
}: DefaultCheckoutPageTemplateProps) {
  if (!business.isStripeConnected) {
    return (
      <PollenGeneralLayout
        business={business}
        title="Checkout"
        subtitle="Complete Your Order"
        showCTA={false}
      >
        <section className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            Checkout Unavailable
          </h2>
          <p className="mb-8 text-gray-600">
            This store hasn&apos;t set up payment processing yet. Please contact
            the store owner.
          </p>
          <Link
            href="/shop"
            className="rounded-md bg-[#215935] px-6 py-2.5 font-semibold text-white hover:bg-[#1a4729]"
          >
            Continue Shopping
          </Link>
        </section>
      </PollenGeneralLayout>
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

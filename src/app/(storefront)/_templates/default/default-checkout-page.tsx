import type { RouterOutputs } from "~/trpc/react";

import { StorefrontFooter } from "../../_components/storefront-footer";
import { StorefrontHeader } from "../../_components/storefront-header";
import { CheckoutForm } from "../../checkout/_components/checkout-form";

export async function DefaultCheckoutPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["get"]>;
}) {
  // Check if Stripe is connected
  if (!business.stripeAccountId) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Checkout Unavailable
          </h1>
          <p className="text-gray-600">
            This store hasn&apos;t set up payment processing yet. Please contact
            the store owner.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Checkout</h1>
        <CheckoutForm business={business} />
      </div>
    </main>
  );
}

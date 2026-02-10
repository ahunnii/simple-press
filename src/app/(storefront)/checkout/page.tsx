import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { StorefrontHeader } from "../_components/storefront-header";
import { CheckoutForm } from "./_components/checkout-form";

export default async function CheckoutPage() {
  // Find business
  const business = await api.business.get();

  if (!business) {
    notFound();
  }

  // Check if Stripe is connected
  if (!business.stripeAccountId) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <StorefrontHeader business={business} />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-2xl font-bold text-gray-900">
              Checkout Unavailable
            </h1>
            <p className="text-gray-600">
              This store hasn&apos;t set up payment processing yet. Please
              contact the store owner.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StorefrontHeader business={business} />

      <main className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">Checkout</h1>
          <CheckoutForm business={business} />
        </div>
      </main>
    </div>
  );
}

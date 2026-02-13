import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { StorefrontHeader } from "../_components/storefront-header";
import { DarkTrendCheckoutPage } from "../_templates/dark-trend/dark-trend-checkout-page";
import { DefaultCheckoutPage } from "../_templates/default/default-checkout-page";
import { ModernCheckoutPage } from "../_templates/modern/modern-checkout-page";

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

  const TemplateComponent =
    {
      "dark-trend": DarkTrendCheckoutPage,
      modern: ModernCheckoutPage,
    }[business.templateId] ?? DefaultCheckoutPage;

  return <TemplateComponent business={business} />;
}

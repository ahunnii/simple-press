import type { DefaultCheckoutPageTemplateProps } from "../types";

import { DarkTrendCheckoutForm } from "./dark-trend-checkout-form";
import { DarkTrendGeneralLayout } from "./dark-trend-general-layout";

export async function DarkTrendCheckoutPage({
  business,
}: DefaultCheckoutPageTemplateProps) {
  // Check if Stripe is connected
  if (!business.isStripeConnected) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-[#1A1A1A] p-4">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-white">
            Checkout Unavailable
          </h1>
          <p className="text-white/70">
            This store hasn&apos;t set up payment processing yet. Please contact
            the store owner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DarkTrendGeneralLayout title="Checkout">
      <DarkTrendCheckoutForm business={business} />
    </DarkTrendGeneralLayout>
  );
}

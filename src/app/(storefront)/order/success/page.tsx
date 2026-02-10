import { Suspense } from "react";
import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { OrderConfirmation } from "../_components/order-confirmation";
import { StorefrontFooter } from "../../_components/storefront-footer";
import { StorefrontHeader } from "../../_components/storefront-header";

export default async function OrderSuccessPage() {
  // Find business
  const business = await api.business.get();

  if (!business) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StorefrontHeader business={business} />

      <main className="flex-1 px-4 py-12">
        <Suspense
          fallback={
            <div className="mx-auto max-w-2xl text-center">
              <p>Loading...</p>
            </div>
          }
        >
          <OrderConfirmation business={business} />
        </Suspense>
      </main>

      <StorefrontFooter business={business} />
    </div>
  );
}

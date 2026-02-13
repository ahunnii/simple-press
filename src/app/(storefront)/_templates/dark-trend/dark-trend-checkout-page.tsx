import type { RouterOutputs } from "~/trpc/react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

import { DarkTrendCheckoutForm } from "./dark-trend-checkout-form";

export async function DarkTrendCheckoutPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["get"]>;
}) {
  // Check if Stripe is connected
  if (!business.stripeAccountId) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#1A1A1A] p-4">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-white">
            Checkout Unavailable
          </h1>
          <p className="text-white/70">
            This store hasn&apos;t set up payment processing yet. Please contact
            the store owner.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#1A1A1A] px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mt-10 mb-20 w-full space-y-4">
          <Breadcrumb className="mx-auto w-full">
            <BreadcrumbList className="mx-auto w-full justify-center text-center">
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/"
                  className="text-white/80 hover:text-white"
                >
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/60" />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-purple-500">
                  Checkout
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="mb-2 text-center text-4xl font-bold text-white lg:text-7xl">
            Checkout
          </h1>
        </div>

        <DarkTrendCheckoutForm business={business} />
      </div>
    </main>
  );
}

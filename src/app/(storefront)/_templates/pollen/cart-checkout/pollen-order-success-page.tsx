import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";

import { DefaultOrderConfirmation } from "../../default/cart-checkout/default-order-confirmation";
import { PollenGeneralLayout } from "../layout/pollen-general-layout";

export function PollenOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  return (
    <PollenGeneralLayout
      business={business}
      title="Order Confirmed"
      subtitle="Thank You"
      showCTA={false}
    >
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div role="status" className="mx-auto max-w-2xl text-center">
              <p className="text-gray-600">Loading your order details...</p>
            </div>
          }
        >
          <DefaultOrderConfirmation business={business} />
        </Suspense>
      </section>
    </PollenGeneralLayout>
  );
}

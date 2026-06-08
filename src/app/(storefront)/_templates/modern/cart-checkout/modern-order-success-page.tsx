import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";

import { DefaultOrderConfirmation } from "../../default/cart-checkout/default-order-confirmation";

export function ModernOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  return (
    <div className="flex-1 px-4 py-12">
      <Suspense
        fallback={
          <div role="status" className="mx-auto max-w-2xl text-center">
            <p className="text-muted-foreground">Loading your order details…</p>
          </div>
        }
      >
        <DefaultOrderConfirmation business={business} />
      </Suspense>
    </div>
  );
}

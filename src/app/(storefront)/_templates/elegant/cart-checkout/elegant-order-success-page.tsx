import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";

import { DefaultOrderConfirmation } from "../../default/cart-checkout/default-order-confirmation";

export function ElegantOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  return (
    <div className="min-h-screen">
      <section className="bg-secondary/30 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-muted-foreground mb-2 text-sm tracking-widest uppercase">
            Thank You
          </p>
          <h1 className="text-foreground font-serif text-4xl font-light tracking-wide">
            Order Confirmed
          </h1>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <p className="text-muted-foreground text-center">
              Loading order details…
            </p>
          }
        >
          <DefaultOrderConfirmation business={business} />
        </Suspense>
      </section>
    </div>
  );
}

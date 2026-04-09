import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";

import { DefaultOrderConfirmation } from "../default/default-order-confirmation";

export function ElegantOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  return (
    <div className="min-h-screen">
      <section className="bg-secondary/30 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-2 text-sm tracking-widest text-muted-foreground uppercase">
            Thank You
          </p>
          <h1 className="font-serif text-4xl font-light tracking-wide text-foreground">
            Order Confirmed
          </h1>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <p className="text-center text-muted-foreground">
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

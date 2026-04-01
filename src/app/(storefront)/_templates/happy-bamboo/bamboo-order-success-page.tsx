import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";

import { BambooOrderConfirmation } from "./bamboo-order-confirmation";

export function BambooOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        }
      >
        <BambooOrderConfirmation business={business} />
      </Suspense>
    </section>
  );
}

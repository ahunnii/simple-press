import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";

import { HappyBambooOrderConfirmation } from "./happy-bamboo-order-confirmation";

export function HappyBambooOrderSuccessPage({
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
        <HappyBambooOrderConfirmation business={business} />
      </Suspense>
    </section>
  );
}

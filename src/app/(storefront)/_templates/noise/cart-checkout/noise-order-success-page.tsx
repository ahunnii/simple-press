import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";

import { NoiseOrderConfirmation } from "./noise-order-confirmation";

export function NoiseOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-sans text-sm text-muted-foreground">Loading...</p>
          </div>
        }
      >
        <NoiseOrderConfirmation business={business} />
      </Suspense>
    </section>
  );
}

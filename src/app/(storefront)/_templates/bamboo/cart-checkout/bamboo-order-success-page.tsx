import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";

import { BambooOrderConfirmation } from "./bamboo-order-confirmation";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};

export function BambooOrderSuccessPage({ business }: Props) {
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

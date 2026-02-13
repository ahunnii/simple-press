import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";

import { DefaultOrderConfirmation } from "./default-order-confirmation";

export function DefaultOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["get"]>;
}) {
  return (
    <main className="flex-1 px-4 py-12">
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl text-center">
            <p>Loading...</p>
          </div>
        }
      >
        <DefaultOrderConfirmation business={business} />
      </Suspense>
    </main>
  );
}

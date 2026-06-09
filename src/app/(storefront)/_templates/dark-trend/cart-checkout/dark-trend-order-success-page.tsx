import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";

import { DarkTrendOrderConfirmation } from "./dark-trend-order-confirmation";

export function DarkTrendOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  return (
    <div className="flex min-h-[75vh] flex-1 items-center justify-center bg-[#1A1A1A] px-4 py-12">
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-white/70">Loading...</p>
          </div>
        }
      >
        <DarkTrendOrderConfirmation business={business} />
      </Suspense>
    </div>
  );
}

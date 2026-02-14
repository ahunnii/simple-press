import type { RouterOutputs } from "~/trpc/react";

import { DefaultHeader } from "./default-header";

export function DefaultCheckoutUnavailable({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["get"]>;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <DefaultHeader business={business} />
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Checkout Unavailable
          </h1>
          <p className="text-gray-600">
            This store hasn&apos;t set up payment processing yet. Please contact
            the store owner.
          </p>
        </div>
      </main>
    </div>
  );
}

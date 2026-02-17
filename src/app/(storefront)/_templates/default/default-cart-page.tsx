import type { RouterOutputs } from "~/trpc/react";

import { DefaultCartContents } from "./default-cart-contents";

export async function DefaultCartPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  return (
    <main className="flex-1 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Shopping Cart</h1>
        <DefaultCartContents business={business} />
      </div>
    </main>
  );
}

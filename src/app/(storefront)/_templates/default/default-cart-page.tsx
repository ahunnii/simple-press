import type { RouterOutputs } from "~/trpc/react";

import { StorefrontFooter } from "../../_components/storefront-footer";
import { StorefrontHeader } from "../../_components/storefront-header";
import { CartContents } from "../../cart/_components/cart-contents";

export async function DefaultCartPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["get"]>;
}) {
  return (
    <main className="flex-1 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Shopping Cart</h1>
        <CartContents business={business} />
      </div>
    </main>
  );
}

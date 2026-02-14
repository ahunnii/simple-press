import type { RouterOutputs } from "~/trpc/react";

import { DefaultProductDetails } from "./default-product-details";

type Props = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
  product: NonNullable<RouterOutputs["product"]["get"]>;
};

export async function DefaultProductPage({ business, product }: Props) {
  return (
    <main className="flex-1 px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <DefaultProductDetails product={product} business={business} />
      </div>
    </main>
  );
}

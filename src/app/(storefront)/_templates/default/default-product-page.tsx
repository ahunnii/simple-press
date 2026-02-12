import type { RouterOutputs } from "~/trpc/react";

import { ProductDetails } from "../../shop/_components/product-details";

type Props = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
  product: NonNullable<RouterOutputs["product"]["get"]>;
};

export async function DefaultProductPage({ business, product }: Props) {
  return (
    <main className="flex-1 px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <ProductDetails product={product} business={business} />
      </div>
    </main>
  );
}

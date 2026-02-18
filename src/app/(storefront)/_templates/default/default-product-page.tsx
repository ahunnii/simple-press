import type { DefaultProductPageTemplateProps } from "../types";

import { DefaultProductDetails } from "./default-product-details";

export async function DefaultProductPage({
  product,
}: DefaultProductPageTemplateProps) {
  return (
    <main className="flex-1 px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <DefaultProductDetails product={product} />
      </div>
    </main>
  );
}

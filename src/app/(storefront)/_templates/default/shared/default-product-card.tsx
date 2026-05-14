// import Image from "next/image";
// import Link from "next/link";

// import { formatPrice } from "~/lib/prices";
// import { Card, CardContent } from "~/components/ui/card";

// type Product = {
//   id: string;
//   name: string;
//   slug: string;
//   price: number;
//   images: Array<{ url: string; altText: string | null }>;
// };

// type ProductCardProps = {
//   product: Product;
// };

// export function DefaultProductCard({ product }: ProductCardProps) {
//   return (
//     <Link href={`/shop/${product.slug}`}>
//       <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
//         <div className="relative aspect-square bg-gray-100">
//           {product.images[0] ? (
//             <Image
//               src={product.images[0].url}
//               alt={product.images[0].altText ?? product.name}
//               fill
//               className="object-cover transition-transform duration-300 group-hover:scale-105"
//             />
//           ) : (
//             <div className="absolute inset-0 flex items-center justify-center">
//               <span className="text-gray-400">No image</span>
//             </div>
//           )}
//         </div>
//         <CardContent className="p-4">
//           <h3 className="mb-1 line-clamp-2 font-semibold text-gray-900">
//             {product.name}
//           </h3>
//           <p className="text-lg font-bold" style={{ color: "#3b82f6" }}>
//             {formatPrice(product.price)}
//           </p>
//         </CardContent>
//       </Card>
//     </Link>
//   );
// }

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";

import type { Product } from "~/types";
import { computeSavingsLabel, formatPrice } from "~/lib/prices";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { Button } from "~/components/ui/button";

type Props = {
  product: Product;
  index: number;
};
export function DefaultProductCard({ product }: Props) {
  const router = useRouter();

  const productStatus = checkProductStatus({
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    trackInventory: product.trackInventory,
    inventoryQty: product.inventoryQty,
    allowBackorders: product.allowBackorders,
    baseInventoryUnit: product.baseInventoryUnit
      ? { inventoryQty: product.baseInventoryUnit.inventoryQty }
      : null,
    baseUnitsConsumed: product.baseUnitsConsumed,
    additionalFields: product.additionalFields,
    variants: product.variants.map((v) => ({
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      inventoryQty: v.inventoryQty,
    })),
  });

  const productImage = product.images[0]?.url ?? "/placeholder.svg";

  return (
    <div className="group relative">
      <Link href={`/shop/${product.slug}`} className="block">
        {/* Image Container */}
        <div className="bg-secondary relative mb-4 aspect-3/4 overflow-hidden rounded-xs">
          {productImage ? (
            <Image
              src={productImage}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="text-muted-foreground flex h-full w-full items-center justify-center">
              <ShoppingBag className="h-12 w-12" />
            </div>
          )}

          {/* Discount Badge */}
          {productStatus.isOnSale && productStatus.displayCompareAtPrice && (
            <div className="bg-primary text-primary-foreground absolute top-3 left-3 rounded px-2 py-1 text-xs font-medium">
              {computeSavingsLabel(
                productStatus.displayPrice,
                productStatus.displayCompareAtPrice,
              )}
            </div>
          )}

          {/* Out of Stock Badge */}
          {productStatus.isOutOfStock && (
            <div className="bg-destructive text-destructive-foreground absolute top-3 right-3 rounded px-2 py-1 text-xs font-medium">
              Sold Out
            </div>
          )}

          {/* Quick Add Button */}
          {/* {productStatus.isAvalable && ( */}
          {/* <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <Button
              onClick={() => router.push(`/shop/${product.slug}`)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-heading w-full tracking-wider"
            >
              VIEW PRODUCT
            </Button>
          </div> */}
          {/* )} */}
        </div>

        {/* Product Info */}
        <div className="space-y-1">
          {/* {product.ad && (
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {product.productType}
          </p>
        )} */}
          <h3 className="text-foreground group-hover:text-primary line-clamp-1 text-center text-base font-normal text-balance transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center justify-center gap-2">
            <p className="text-primary text-sm font-medium">
              {formatPrice(productStatus.displayPrice)}
              {productStatus.variablePricing && (
                <span className="ml-1 text-base">+</span>
              )}
            </p>
            {productStatus.isOnSale && productStatus.displayCompareAtPrice && (
              <p className="text-muted-foreground text-xs line-through">
                {formatPrice(productStatus.displayCompareAtPrice)}
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";

import { Card, CardContent } from "~/components/ui/card";

type RelatedProduct = {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  compareAtPrice: number | null;
  images: { url: string; altText?: string | null }[];
  variants: { price: number | null; compareAtPrice: number | null }[];
};

type Props = {
  relatedProducts: RelatedProduct[];
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function DefaultRelatedProductsSection({ relatedProducts }: Props) {
  if (relatedProducts.length === 0) return null;

  return (
    <div className="mt-16 border-t pt-10">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">
        You Might Also Like
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {relatedProducts.map((p) => {
          const effectivePrice =
            p.variants.length > 0 ? (p.variants[0]?.price ?? p.price) : p.price;
          const compareAtPrice =
            p.variants.length > 0
              ? (p.variants[0]?.compareAtPrice ?? p.compareAtPrice ?? null)
              : (p.compareAtPrice ?? null);
          const isOnSale =
            compareAtPrice != null &&
            compareAtPrice > 0 &&
            compareAtPrice > (effectivePrice ?? 0);

          return (
            <Link key={p.id} href={`/shop/${p.slug}`}>
              <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
                <div className="relative aspect-square bg-gray-100">
                  {p.images[0] ? (
                    <Image
                      src={p.images[0].url}
                      alt={p.images[0].altText ?? p.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm text-gray-400">No image</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="mb-1 line-clamp-2 font-semibold text-gray-900">
                    {p.name}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-900">
                      {formatPrice(effectivePrice ?? 0)}
                    </span>
                    {isOnSale && compareAtPrice && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(compareAtPrice)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

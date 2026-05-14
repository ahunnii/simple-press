import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "~/lib/prices";

type RelatedProduct = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  price: number | null;
  compareAtPrice: number | null;
  images: { url: string; altText?: string | null }[];
  variants: { price: number | null; compareAtPrice: number | null }[];
};

type Props = {
  relatedProducts: RelatedProduct[];
};

export function ElegantRelatedProductsSection({ relatedProducts }: Props) {
  if (relatedProducts.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
      <div className="border-border border-t pt-16">
        <h2 className="text-foreground mb-10 font-serif text-3xl md:text-4xl">
          You May Also Like
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {relatedProducts.map((p) => {
            const effectivePrice =
              p.variants.length > 0
                ? (p.variants[0]?.price ?? p.price)
                : p.price;
            const compareAtPrice =
              p.variants.length > 0
                ? (p.variants[0]?.compareAtPrice ?? p.compareAtPrice ?? null)
                : (p.compareAtPrice ?? null);
            const isOnSale =
              compareAtPrice != null &&
              compareAtPrice > 0 &&
              compareAtPrice > (effectivePrice ?? 0);

            return (
              <Link
                key={p.id}
                href={`/shop/${p.slug}`}
                className="group"
              >
                <div className="bg-card boty-shadow boty-transition overflow-hidden rounded-3xl group-hover:scale-[1.02]">
                  <div className="bg-muted relative aspect-square overflow-hidden">
                    {p.images[0] ? (
                      <Image
                        src={p.images[0].url}
                        alt={p.images[0].altText ?? p.name}
                        fill
                        className="boty-transition object-cover group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-muted-foreground text-sm">
                          No image
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-foreground mb-1 font-serif text-xl">
                      {p.name}
                    </h3>
                    {p.description && (
                      <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">
                        {p.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-foreground text-lg font-medium">
                        {formatPrice(effectivePrice ?? 0)}
                      </span>
                      {isOnSale && compareAtPrice && (
                        <span className="text-muted-foreground text-sm line-through">
                          {formatPrice(compareAtPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

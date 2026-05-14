import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "~/lib/prices";

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

export function ModernRelatedProductsSection({ relatedProducts }: Props) {
  if (relatedProducts.length === 0) return null;

  return (
    <div className="border-border border-t">
      <div className="py-16">
        <h2 className="text-foreground font-serif text-2xl md:text-3xl">
          You may also like
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
              <div key={p.id} className="group">
                <Link href={`/shop/${p.slug}`} className="block">
                  <div className="bg-muted relative aspect-square overflow-hidden rounded-sm">
                    {p.images[0] ? (
                      <Image
                        src={p.images[0].url}
                        alt={p.images[0].altText ?? p.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-muted-foreground text-sm">
                          No image
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="mt-4">
                  <Link href={`/shop/${p.slug}`}>
                    <h3 className="text-foreground group-hover:text-muted-foreground text-sm font-medium transition-colors">
                      {p.name}
                    </h3>
                  </Link>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-muted-foreground text-sm">
                      {formatPrice(effectivePrice ?? 0)}
                    </p>
                    {isOnSale && compareAtPrice && (
                      <p className="text-muted-foreground/60 text-sm line-through">
                        {formatPrice(compareAtPrice)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

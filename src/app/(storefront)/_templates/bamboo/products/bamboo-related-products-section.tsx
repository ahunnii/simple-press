"use client";

import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "~/lib/prices";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

type Props = {
  relatedProducts: {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    price: number | null;
    images: {
      url: string;
    }[];
    variants: {
      price: number | null;
      compareAtPrice: number | null;
    }[];
    compareAtPrice: number | null;
  }[];
};
export function BambooRelatedProductsSection({ relatedProducts }: Props) {
  return (
    <div className="mb-20">
      <FadeIn direction="up">
        <h2 className="text-foreground font-heading text-2xl font-bold">
          You Might Also Like
        </h2>
      </FadeIn>
      <StaggerContainer
        className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2"
        staggerDelay={0.12}
      >
        {relatedProducts?.map((p) => {
          const relatedEffectivePrice =
            p.variants.length > 0 ? (p.variants[0]?.price ?? p.price) : p.price;
          const relatedCompareAtPrice =
            p.variants.length > 0
              ? (p.variants[0]?.compareAtPrice ?? p.compareAtPrice ?? null)
              : (p.compareAtPrice ?? null);
          const relatedIsOnSale =
            relatedCompareAtPrice != null &&
            relatedCompareAtPrice > 0 &&
            relatedCompareAtPrice > (relatedEffectivePrice ?? 0);
          return (
            <StaggerItem key={p.id}>
              <Link
                href={`/shop/${p.slug}`}
                className="group border-border bg-card flex gap-4 rounded-xl border p-4 transition-shadow hover:shadow-lg"
              >
                <div className="bg-secondary relative size-24 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={p.images[0]?.url ?? "/placeholder.svg"}
                    alt={p.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="96px"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-card-foreground group-hover:text-primary font-heading text-base font-semibold transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {p.description}
                  </p>
                  <div className="mt-auto flex items-baseline gap-2">
                    <span className="text-foreground text-lg font-bold">
                      {formatPrice(relatedEffectivePrice ?? 0)}
                    </span>
                    {relatedIsOnSale && relatedCompareAtPrice && (
                      <span className="text-muted-foreground text-sm line-through">
                        {formatPrice(relatedCompareAtPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </StaggerItem>
          );
        })}
        {relatedProducts?.length === 0 && (
          <div className="col-span-full text-center">
            <p className="text-muted-foreground">No related products found</p>
          </div>
        )}
      </StaggerContainer>
    </div>
  );
}

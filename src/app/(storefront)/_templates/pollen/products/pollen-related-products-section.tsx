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
    images: { url: string }[];
    variants: {
      price: number | null;
      compareAtPrice: number | null;
    }[];
    compareAtPrice: number | null;
  }[];
};

export function PollenRelatedProductsSection({ relatedProducts }: Props) {
  return (
    <div className="mb-20">
      <FadeIn direction="up">
        <h2 className="text-2xl font-bold uppercase tracking-wide text-[#2a351f]">
          You Might Also Like
        </h2>
      </FadeIn>
      <StaggerContainer
        className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2"
        staggerDelay={0.12}
      >
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
            <StaggerItem key={p.id}>
              <Link
                href={`/shop/${p.slug}`}
                className="group flex gap-4 rounded-md border border-[#2a351f]/20 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="relative size-24 shrink-0 overflow-hidden rounded-sm bg-[#f5f2ee]">
                  <Image
                    src={p.images[0]?.url ?? "/placeholder.svg"}
                    alt={p.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="96px"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-[#2a351f] transition-colors group-hover:text-[#5e7747]">
                    {p.name}
                  </h3>
                  <p className="line-clamp-2 text-sm text-[#4c566a]">
                    {p.description}
                  </p>
                  <div className="mt-auto flex items-baseline gap-2">
                    <span className="text-lg font-bold text-[#215935]">
                      {formatPrice(effectivePrice ?? 0)}
                    </span>
                    {isOnSale && compareAtPrice && (
                      <span className="text-sm text-[#4c566a] line-through">
                        {formatPrice(compareAtPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </StaggerItem>
          );
        })}
        {relatedProducts.length === 0 && (
          <div className="col-span-full text-center">
            <p className="text-[#4c566a]">No related products found</p>
          </div>
        )}
      </StaggerContainer>
    </div>
  );
}

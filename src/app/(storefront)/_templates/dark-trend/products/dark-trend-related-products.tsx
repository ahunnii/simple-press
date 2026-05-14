"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

import { formatPrice } from "~/lib/prices";

type RelatedProduct = {
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
};

type Props = {
  relatedProducts: RelatedProduct[];
};

function RelatedCard({
  product,
  index,
}: {
  product: RelatedProduct;
  index: number;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const effectivePrice =
    product.variants.length > 0
      ? (product.variants[0]?.price ?? product.price)
      : product.price;
  const compareAtPrice =
    product.variants.length > 0
      ? (product.variants[0]?.compareAtPrice ?? product.compareAtPrice ?? null)
      : (product.compareAtPrice ?? null);
  const isOnSale =
    compareAtPrice != null &&
    compareAtPrice > 0 &&
    compareAtPrice > (effectivePrice ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Link href={`/shop/${product.slug}`} className="group block">
        <div className="overflow-hidden rounded-xl bg-[#1F1F1F] transition-all duration-700 group-hover:scale-[1.02]">
          <div className="relative aspect-square overflow-hidden">
            <div
              className={`from-muted via-muted/50 to-muted absolute inset-0 animate-pulse bg-linear-to-br transition-opacity duration-500 ${
                imageLoaded ? "opacity-0" : "opacity-100"
              }`}
            />
            <Image
              src={product.images[0]?.url ?? "/placeholder.svg"}
              alt={product.name}
              fill
              className={`object-cover transition-all duration-700 group-hover:scale-105 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              onLoad={() => setImageLoaded(true)}
            />
            {isOnSale && (
              <span className="bg-destructive/10 text-destructive absolute top-4 left-4 rounded-full px-3 py-1 text-xs tracking-wide">
                Sale
              </span>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          </div>
          <div className="p-5">
            <h3 className="mb-2 text-base font-semibold text-white">
              {product.name}
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-medium text-white">
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
    </motion.div>
  );
}

export function DarkTrendRelatedProducts({ relatedProducts }: Props) {
  if (relatedProducts.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
      <div className="mb-10 flex items-baseline gap-4">
        {/* <span className="font-mono text-sm text-purple-500">03.</span> */}
        <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          You May Also Like
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {relatedProducts.map((p, i) => (
          <RelatedCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </div>
  );
}

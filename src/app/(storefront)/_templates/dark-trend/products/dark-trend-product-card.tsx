"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye } from "lucide-react";

import { formatPrice } from "~/lib/prices";

type Props = {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    originalPrice: number | null;
    image: string;
    badge: string | null;
    category: string;
    slug: string;
  };
  index: number;
};
export function DarkTrendProductCard({ product, index }: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Link
      href={`/shop/${product.slug}`}
      className={`group transition-all duration-700 ease-out`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="boty-transition overflow-hidden rounded-xl bg-[#1F1F1F] group-hover:scale-[1.02]">
        {/* Image */}
        <div className="bg-muted relative aspect-square overflow-hidden">
          {/* Skeleton */}
          <div
            className={`from-muted via-muted/50 to-muted absolute inset-0 animate-pulse bg-linear-to-br transition-opacity duration-500 ${
              imageLoaded ? "opacity-0" : "opacity-100"
            }`}
          />

          <Image
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            fill
            className={`boty-transition object-cover transition-opacity duration-500 group-hover:scale-105 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImageLoaded(true)}
          />
          {/* Badge */}
          {product.badge && (
            <span
              className={`absolute top-4 left-4 rounded-full px-3 py-1 text-xs tracking-wide ${
                product.badge === "Sale"
                  ? "bg-destructive/10 text-destructive"
                  : product.badge === "New"
                    ? "bg-primary/10 text-primary"
                    : "bg-accent text-accent-foreground"
              }`}
            >
              {product.badge}
            </span>
          )}
          {/* Quick add button */}
          <button
            type="button"
            className="boty-transition boty-shadow absolute right-4 bottom-4 flex h-12 w-12 translate-y-2 items-center justify-center rounded-full bg-purple-500 opacity-0 backdrop-blur-sm group-hover:translate-y-0 group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
            }}
            aria-label="Add to cart"
          >
            <Eye className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Info */}
        <div className="p-6">
          <h3 className="mb-1 text-xl text-white">{product.name}</h3>
          {/* <p className="mb-4 text-sm text-white/80">{product.description}</p> */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-white">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-muted-foreground text-sm line-through">
                ${product.originalPrice}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, SlidersHorizontal, X } from "lucide-react";

// const products = [
//   // Serums
//   {
//     id: "radiance-serum",
//     name: "Radiance Serum",
//     description: "Vitamin C brightening formula",
//     price: 68,
//     originalPrice: null,
//     image: "/images/products/serum-bottles-1.png",
//     badge: "Bestseller",
//     category: "serums",
//   },
//   {
//     id: "hydrating-serum",
//     name: "Hydrating Serum",
//     description: "Hyaluronic acid moisture boost",
//     price: 62,
//     originalPrice: null,
//     image: "/images/products/eye-serum-bottles.png",
//     badge: null,
//     category: "serums",
//   },
//   {
//     id: "age-defense-serum",
//     name: "Age Defense Serum",
//     description: "Retinol & peptide complex",
//     price: 78,
//     originalPrice: null,
//     image: "/images/products/amber-dropper-bottles.png",
//     badge: "New",
//     category: "serums",
//   },
//   {
//     id: "glow-serum",
//     name: "Glow Serum",
//     description: "Niacinamide brightening boost",
//     price: 58,
//     originalPrice: 68,
//     image: "/images/products/spray-bottles.png",
//     badge: "Sale",
//     category: "serums",
//   },
//   // Creams
//   {
//     id: "hydra-cream",
//     name: "Hydra Cream",
//     description: "Deep moisture with hyaluronic acid",
//     price: 54,
//     originalPrice: null,
//     image: "/images/products/cream-jars-colored.png",
//     badge: null,
//     category: "moisturizers",
//   },
//   {
//     id: "gentle-cleanser",
//     name: "Gentle Cleanser",
//     description: "Soothing botanical wash",
//     price: 38,
//     originalPrice: 48,
//     image: "/images/products/tube-bottles.png",
//     badge: "Sale",
//     category: "cleansers",
//   },
//   {
//     id: "night-cream",
//     name: "Night Cream",
//     description: "Restorative overnight treatment",
//     price: 64,
//     originalPrice: null,
//     image: "/images/products/jars-wooden-lid.png",
//     badge: "Bestseller",
//     category: "moisturizers",
//   },
//   {
//     id: "day-cream-spf",
//     name: "Day Cream SPF 30",
//     description: "Protection & hydration",
//     price: 58,
//     originalPrice: null,
//     image: "/images/products/pump-bottles-lavender.png",
//     badge: null,
//     category: "moisturizers",
//   },
//   // Oils
//   {
//     id: "renewal-oil",
//     name: "Renewal Oil",
//     description: "Nourishing facial oil blend",
//     price: 72,
//     originalPrice: null,
//     image: "/images/products/amber-dropper-bottles.png",
//     badge: "New",
//     category: "oils",
//   },
//   {
//     id: "rosehip-oil",
//     name: "Rosehip Oil",
//     description: "Pure organic rosehip extract",
//     price: 48,
//     originalPrice: null,
//     image: "/images/products/serum-bottles-1.png",
//     badge: null,
//     category: "oils",
//   },
//   {
//     id: "jojoba-oil",
//     name: "Jojoba Oil",
//     description: "Balancing & lightweight",
//     price: 42,
//     originalPrice: null,
//     image: "/images/products/spray-bottles.png",
//     badge: null,
//     category: "oils",
//   },
//   {
//     id: "argan-oil",
//     name: "Argan Oil",
//     description: "Moroccan beauty elixir",
//     price: 56,
//     originalPrice: null,
//     image: "/images/products/pump-bottles-cream.png",
//     badge: "Bestseller",
//     category: "oils",
//   },
//   // Masks & Toners (original products)
//   {
//     id: "glow-mask",
//     name: "Glow Mask",
//     description: "Weekly brightening treatment",
//     price: 45,
//     originalPrice: null,
//     image: "/images/products/mask.jpg",
//     badge: null,
//     category: "masks",
//   },
//   {
//     id: "balance-toner",
//     name: "Balance Toner",
//     description: "pH restoring mist",
//     price: 32,
//     originalPrice: null,
//     image: "/images/products/toner.jpg",
//     badge: "New",
//     category: "toners",
//   },
// ];

type CardProduct = {
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
export function DarkTrendProductCard({
  product,
  index,
}: {
  product: CardProduct;
  index: number;
}) {
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
            className={`from-muted via-muted/50 to-muted absolute inset-0 animate-pulse bg-gradient-to-br transition-opacity duration-500 ${
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
            <ShoppingBag className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Info */}
        <div className="p-6">
          <h3 className="mb-1 text-xl text-white">{product.name}</h3>
          <p className="mb-4 text-sm text-white/80">{product.description}</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-white">
              ${product.price}
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

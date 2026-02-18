"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBag, SlidersHorizontal, X } from "lucide-react";

import type { DefaultProductsPageTemplateProps } from "../types";
import type { RouterOutputs } from "~/trpc/react";

import { ElegantProductCard } from "./elegant-product-card";

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

// const categories = [
//   "all",
//   "serums",
//   "moisturizers",
//   "cleansers",
//   "oils",
//   "masks",
//   "toners",
// ];

export function ElegantShopPage({
  business,
}: DefaultProductsPageTemplateProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  //   const filteredProducts =
  //     selectedCategory === "all"
  //       ? products
  //       : products.filter((p) => p.category === selectedCategory);

  const filteredProducts = business.products ?? [];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (gridRef.current) {
      observer.observe(gridRef.current);
    }

    return () => {
      if (gridRef.current) {
        observer.unobserve(gridRef.current);
      }
    };
  }, []);

  // Reset animation when category changes
  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, [selectedCategory]);

  return (
    <div className="pt-28 pb-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <span className="text-primary mb-4 block text-sm tracking-[0.3em] uppercase">
            Our Collection
          </span>
          <h1 className="text-foreground mb-4 font-serif text-4xl text-balance md:text-5xl lg:text-6xl">
            Shop All Products
          </h1>
          <p className="text-muted-foreground mx-auto max-w-md text-lg">
            Discover what {business?.name ?? "we"} has to offer
          </p>
        </div>

        {/* Filter Bar */}
        <div className="border-border/50 mb-10 flex items-center justify-between border-b pb-6">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="text-foreground inline-flex items-center gap-2 text-sm lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>

          {/* Desktop Categories */}
          {/* <div className="hidden items-center gap-2 lg:flex">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`boty-transition bg-popover rounded-full px-4 py-2 text-sm capitalize ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground/70 hover:text-foreground boty-shadow"
                }`}
              >
                {category}
              </button>
            ))}
          </div> */}

          <span className="text-muted-foreground text-sm">
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1 ? "product" : "products"}
          </span>
        </div>

        {/* Mobile Filters */}
        {showFilters && (
          <div className="bg-background fixed inset-0 z-50 lg:hidden">
            <div className="p-6">
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-foreground font-serif text-2xl">Filters</h2>
                <button
                  title="Close filters"
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="text-foreground/70 hover:text-foreground p-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {/* <div className="space-y-3">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(category);
                      setShowFilters(false);
                    }}
                    className={`boty-transition w-full rounded-2xl px-6 py-4 text-left capitalize ${
                      selectedCategory === category
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground boty-shadow"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div> */}
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div ref={gridRef} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product, index) => (
            <ElegantProductCard
              key={product.id}
              product={{
                id: product.id,
                name: product.name ?? "",
                description: product.description ?? "No description available",
                price: product.variants[0]?.price ?? 0,
                originalPrice: null,
                image: product.images[0]?.url ?? "",
                badge: null,
                category: "",
                slug: product.slug ?? "",
              }}
              index={index}
              isVisible={isVisible}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

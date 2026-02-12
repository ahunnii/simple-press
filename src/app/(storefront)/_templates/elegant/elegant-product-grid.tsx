"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { useCart } from "~/providers/cart-context";

type Category = "cream" | "oil" | "serum";

const products = [
  // Serums
  {
    id: "radiance-serum",
    name: "Radiance Serum",
    description: "Vitamin C brightening formula",
    price: 68,
    originalPrice: null,
    image: "/images/products/serum-bottles-1.png",
    badge: "Bestseller",
    category: "serum" as Category,
  },
  {
    id: "hydrating-serum",
    name: "Hydrating Serum",
    description: "Hyaluronic acid moisture boost",
    price: 62,
    originalPrice: null,
    image: "/images/products/eye-serum-bottles.png",
    badge: null,
    category: "serum" as Category,
  },
  {
    id: "age-defense-serum",
    name: "Age Defense Serum",
    description: "Retinol & peptide complex",
    price: 78,
    originalPrice: null,
    image: "/images/products/amber-dropper-bottles.png",
    badge: "New",
    category: "serum" as Category,
  },
  {
    id: "glow-serum",
    name: "Glow Serum",
    description: "Niacinamide brightening boost",
    price: 58,
    originalPrice: 68,
    image: "/images/products/spray-bottles.png",
    badge: "Sale",
    category: "serum" as Category,
  },
  // Creams
  {
    id: "hydra-cream",
    name: "Hydra Cream",
    description: "Deep moisture with hyaluronic acid",
    price: 54,
    originalPrice: null,
    image: "/images/products/cream-jars-colored.png",
    badge: null,
    category: "cream" as Category,
  },
  {
    id: "gentle-cleanser",
    name: "Gentle Cleanser",
    description: "Soothing botanical wash",
    price: 38,
    originalPrice: 48,
    image: "/images/products/tube-bottles.png",
    badge: "Sale",
    category: "cream" as Category,
  },
  {
    id: "night-cream",
    name: "Night Cream",
    description: "Restorative overnight treatment",
    price: 64,
    originalPrice: null,
    image: "/images/products/jars-wooden-lid.png",
    badge: "Bestseller",
    category: "cream" as Category,
  },
  {
    id: "day-cream-spf",
    name: "Day Cream SPF 30",
    description: "Protection & hydration",
    price: 58,
    originalPrice: null,
    image: "/images/products/pump-bottles-lavender.png",
    badge: null,
    category: "cream" as Category,
  },
  // Oils
  {
    id: "renewal-oil",
    name: "Renewal Oil",
    description: "Nourishing facial oil blend",
    price: 72,
    originalPrice: null,
    image: "/images/products/amber-dropper-bottles.png",
    badge: "New",
    category: "oil" as Category,
  },
  {
    id: "rosehip-oil",
    name: "Rosehip Oil",
    description: "Pure organic rosehip extract",
    price: 48,
    originalPrice: null,
    image: "/images/products/serum-bottles-1.png",
    badge: null,
    category: "oil" as Category,
  },
  {
    id: "jojoba-oil",
    name: "Jojoba Oil",
    description: "Balancing & lightweight",
    price: 42,
    originalPrice: null,
    image: "/images/products/spray-bottles.png",
    badge: null,
    category: "oil" as Category,
  },
  {
    id: "argan-oil",
    name: "Argan Oil",
    description: "Moroccan beauty elixir",
    price: 56,
    originalPrice: null,
    image: "/images/products/pump-bottles-cream.png",
    badge: "Bestseller",
    category: "oil" as Category,
  },
];

const categories = [
  { value: "cream" as Category, label: "Cream" },
  { value: "oil" as Category, label: "Oil" },
  { value: "serum" as Category, label: "Serum" },
];

export function ElegantProductGrid({
  homepage,
}: {
  homepage: RouterOutputs["business"]["getHomepage"];
}) {
  const [selectedCategory, setSelectedCategory] = useState<Category>("cream");
  const [isVisible, setIsVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();

  // const filteredProducts = products.filter(
  //   (product) => product.category === selectedCategory,
  // );

  const filteredProducts = homepage?.products ?? [];

  const handleCategoryChange = (category: Category) => {
    if (category !== selectedCategory) {
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedCategory(category);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 300);
    }
  };

  // Preload all product images on mount
  useEffect(() => {
    products.forEach((product) => {
      const img = new window.Image();
      img.src = product.image;
    });
  }, []);

  useEffect(() => {
    const gridObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    const headerObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHeaderVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (gridRef.current) {
      gridObserver.observe(gridRef.current);
    }

    if (headerRef.current) {
      headerObserver.observe(headerRef.current);
    }

    return () => {
      if (gridRef.current) {
        gridObserver.unobserve(gridRef.current);
      }
      if (headerRef.current) {
        headerObserver.unobserve(headerRef.current);
      }
    };
  }, []);

  return (
    <section className="bg-card py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="mb-16 text-center">
          <span
            className={`text-primary mb-4 block text-sm tracking-[0.3em] uppercase ${headerVisible ? "animate-blur-in opacity-0" : "opacity-0"}`}
            style={
              headerVisible
                ? { animationDelay: "0.2s", animationFillMode: "forwards" }
                : {}
            }
          >
            Our Products
          </span>
          <h2
            className={`text-foreground mb-4 font-serif text-7xl leading-tight text-balance ${headerVisible ? "animate-blur-in opacity-0" : "opacity-0"}`}
            style={
              headerVisible
                ? { animationDelay: "0.4s", animationFillMode: "forwards" }
                : {}
            }
          >
            Featured
          </h2>
          <p
            className={`text-muted-foreground mx-auto max-w-md text-lg ${headerVisible ? "animate-blur-in opacity-0" : "opacity-0"}`}
            style={
              headerVisible
                ? { animationDelay: "0.6s", animationFillMode: "forwards" }
                : {}
            }
          >
            Thoughtfully crafted products, made by hand
          </p>
        </div>

        {/* Segmented Control */}
        {/* <div className="mb-12 flex justify-center">
          <div className="bg-background relative inline-flex gap-1 rounded-full p-1">
            <div
              className="bg-foreground absolute top-1 bottom-1 rounded-full shadow-sm transition-all duration-300 ease-out"
              style={{
                left:
                  selectedCategory === "cream"
                    ? "4px"
                    : selectedCategory === "oil"
                      ? "calc(33.333% + 2px)"
                      : "calc(66.666%)",
                width: "calc(33.333% - 4px)",
              }}
            />
            {categories.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => handleCategoryChange(category.value)}
                className={`relative z-10 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-300 ${
                  selectedCategory === category.value
                    ? "text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div> */}

        <div ref={gridRef} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filteredProducts.map((product, index) => (
            <Link
              key={`${selectedCategory}-${product.id}`}
              href={`/product/${product.id}`}
              className={`group transition-all duration-500 ease-out ${
                isVisible && !isTransitioning
                  ? "scale-100 opacity-100"
                  : "scale-95 opacity-0"
              }`}
              style={{
                transitionDelay: isTransitioning ? "0ms" : `${index * 80}ms`,
              }}
            >
              <div className="bg-background boty-shadow boty-transition overflow-hidden rounded-3xl group-hover:scale-[1.02]">
                <div className="bg-muted relative aspect-square overflow-hidden">
                  <Image
                    src={product.images[0]?.url ?? "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className="boty-transition object-cover group-hover:scale-105"
                  />

                  {/* {product.badge && (
                    <span
                      className={`absolute top-4 left-4 rounded-full bg-white px-3 py-1 text-xs tracking-wide text-black ${
                        product.badge === "Sale"
                          ? "bg-destructive/10 text-destructive"
                          : product.badge === "New"
                            ? "bg-primary/10 text-primary"
                            : "bg-accent text-accent-foreground"
                      }`}
                    >
                      {product.badge}
                    </span>
                  )} */}
                  {/* Quick add button */}
                  <button
                    type="button"
                    className="bg-background/90 boty-transition boty-shadow absolute right-4 bottom-4 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full opacity-0 backdrop-blur-sm group-hover:translate-y-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addItem({
                        productId: product.id,
                        variantId: null,
                        productName: product.name,
                        variantName: null,
                        price: product.price,
                        imageUrl: product.images[0]?.url ?? null,
                        sku: null,
                      });
                    }}
                    aria-label="Add to cart"
                  >
                    <ShoppingBag className="text-foreground h-4 w-4" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="text-foreground mb-1 font-serif text-lg">
                    {product.name}
                  </h3>
                  <p className="text-muted-foreground mb-3 text-sm">
                    {product.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium">
                      ${product.price}
                    </span>
                    {/* {product.originalPrice && (
                      <span className="text-muted-foreground text-sm line-through">
                        ${product.originalPrice}
                      </span>
                    )} */}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-12 text-center">
          <Link
            href="/shop"
            className="border-foreground/20 text-foreground boty-transition hover:bg-foreground/5 inline-flex items-center justify-center gap-2 rounded-full border bg-transparent px-8 py-4 text-sm tracking-wide"
          >
            View All Products
          </Link>
        </div>
      </div>
    </section>
  );
}

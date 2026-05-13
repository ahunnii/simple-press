/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import type { DefaultProductsPageTemplateProps } from "../../types";
import { getEffectiveCompareAtPrice, getEffectivePrice } from "~/lib/prices";

import { ElegantProductCard } from "./elegant-product-card";

export function ElegantShopPage({
  business,
}: DefaultProductsPageTemplateProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

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
    <div className="pt-32 pb-20">
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
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div
          ref={gridRef}
          className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          {filteredProducts.map((product, index) => (
            <ElegantProductCard
              key={product.id}
              product={product}
              index={index}
              isVisible={isVisible}
              saleBadgeFormat={"true"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

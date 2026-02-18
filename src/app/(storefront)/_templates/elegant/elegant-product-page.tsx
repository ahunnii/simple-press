"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronLeft, Minus, Plus } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../types";
import { useProduct } from "~/hooks/use-product";

import { ElegantVariantSelector } from "./elegant-variant-selector";

// const benefits = [
//   { icon: Leaf, label: "100% Natural" },
//   { icon: Heart, label: "Cruelty-Free" },
//   { icon: Recycle, label: "Eco-Friendly" },
//   { icon: Award, label: "Expert Approved" },
// ];

// type AccordionSection = "details" | "howToUse" | "ingredients" | "delivery";

export function ElegantProductPage({
  product,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    inStock,

    variantOptions,

    displayPrice,
    handleAddToCart,
    remainingStock,
    canAddMore,
    handleDecrement,

    handleIncrement,
    quantity,

    selectedVariantId,
    setSelectedVariantId,
  } = useProduct(product);

  //   const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  //   const [quantity, setQuantity] = useState(1);
  //   const [openAccordion, setOpenAccordion] = useState<AccordionSection | null>(
  //     "details",
  //   );
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [product.slug]);

  //   const toggleAccordion = (section: AccordionSection) => {
  //     setOpenAccordion(openAccordion === section ? null : section);
  //   };

  const addToCart = () => {
    handleAddToCart();
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  //   const accordionItems: {
  //     key: AccordionSection;
  //     title: string;
  //     content: string;
  //   }[] = [
  //     { key: "details", title: "Details", content: product.details },
  //     { key: "howToUse", title: "How to Use", content: product.howToUse },
  //     { key: "ingredients", title: "Ingredients", content: product.ingredients },
  //     { key: "delivery", title: "Delivery & Returns", content: product.delivery },
  //   ];

  return (
    <div className="pt-28 pb-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/shop"
          className="text-muted-foreground hover:text-foreground boty-transition mb-8 inline-flex items-center gap-2 text-sm"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Shop
        </Link>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Product Image */}
          <div className="bg-card boty-shadow relative aspect-square overflow-hidden rounded-3xl">
            <Image
              src={product?.images[0]?.url ?? "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            {/* Header */}
            <div className="mb-8">
              <span className="text-primary mb-2 block text-sm tracking-[0.3em] uppercase">
                Product
              </span>
              <h1 className="text-foreground mb-3 font-serif text-4xl md:text-5xl">
                {product.name}
              </h1>
              <p className="text-muted-foreground mb-4 text-lg italic">
                {/* {product.tagline} */}
                Tagline goes here
              </p>

              {/* Rating */}
              {/* <div className="mb-4 flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="fill-primary text-primary h-4 w-4"
                    />
                  ))}
                </div>
                <span className="text-muted-foreground text-sm">
                  (128 reviews)
                </span>
              </div> */}

              <p className="text-foreground/80 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Price */}
            <div className="mb-8 flex items-center gap-3">
              <span className="text-foreground text-3xl font-medium">
                {formatPrice(displayPrice)}
              </span>
              {/* {product.originalPrice && (
                <span className="text-muted-foreground text-xl line-through">
                  ${product.originalPrice}
                </span>
              )} */}
            </div>

            {Object.keys(variantOptions).length > 0 ? (
              <ElegantVariantSelector
                product={product}
                selectedVariantId={selectedVariantId}
                setSelectedVariantId={setSelectedVariantId}
              />
            ) : (
              <>
                {canAddMore && (
                  <>
                    {/* Quantity Selector */}
                    <div className="mb-8">
                      <label className="text-foreground mb-3 block text-sm font-medium">
                        Quantity
                      </label>
                      <div className="bg-card boty-shadow inline-flex items-center gap-4 rounded-full px-2 py-2">
                        <button
                          type="button"
                          onClick={handleDecrement}
                          disabled={quantity <= 1}
                          className="bg-background text-foreground/60 hover:text-foreground boty-transition flex h-10 w-10 items-center justify-center rounded-full"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-foreground w-8 text-center font-medium">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={handleIncrement}
                          disabled={quantity >= remainingStock}
                          className="bg-background text-foreground/60 hover:text-foreground boty-transition flex h-10 w-10 items-center justify-center rounded-full"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </button>

                        <span className="text-sm text-gray-500">
                          {remainingStock > 1
                            ? `${remainingStock} available`
                            : "Last one!"}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Add to Cart Buttons */}
                <div className="mb-10 flex flex-col gap-4 sm:flex-row">
                  <button
                    type="button"
                    onClick={addToCart}
                    className={`boty-transition boty-shadow inline-flex flex-1 items-center justify-center gap-2 rounded-full px-8 py-4 text-sm tracking-wide ${
                      isAdded
                        ? "bg-primary/80 text-primary-foreground"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="h-4 w-4" />
                        Added to Cart
                      </>
                    ) : (
                      "Add to Cart"
                    )}
                  </button>
                  <button
                    type="button"
                    className="border-foreground/20 text-foreground boty-transition hover:bg-foreground/5 inline-flex flex-1 items-center justify-center gap-2 rounded-full border bg-transparent px-8 py-4 text-sm tracking-wide"
                  >
                    Buy Now
                  </button>
                </div>

                {!canAddMore && inStock && (
                  <p className="mt-3 text-center text-sm text-amber-600">
                    You have the maximum available quantity in your cart
                  </p>
                )}
              </>
            )}
            {/* Size Selector */}
            {/* <div className="mb-6">
              <label className="text-foreground mb-3 block text-sm font-medium">
                Size
              </label>
              <div className="flex gap-3">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`boty-transition boty-shadow rounded-full px-6 py-3 text-sm ${
                      selectedSize === size
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground hover:bg-card/80"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div> */}

            {/* Benefits */}
            {/* <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {benefits.map((benefit) => (
                <div
                  key={benefit.label}
                  className="boty-shadow flex flex-col items-center gap-2 rounded-md bg-transparent p-4 shadow-none"
                >
                  <benefit.icon className="text-primary h-5 w-5" />
                  <span className="text-muted-foreground text-center text-xs">
                    {benefit.label}
                  </span>
                </div>
              ))}
            </div> */}

            {/* Accordion */}
            {/* <div className="border-border/50 border-t">
              {accordionItems.map((item) => (
                <div key={item.key} className="border-border/50 border-b">
                  <button
                    type="button"
                    onClick={() => toggleAccordion(item.key)}
                    className="flex w-full items-center justify-between py-5 text-left"
                  >
                    <span className="text-foreground font-medium">
                      {item.title}
                    </span>
                    <ChevronDown
                      className={`text-muted-foreground boty-transition h-5 w-5 ${
                        openAccordion === item.key ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`boty-transition overflow-hidden ${
                      openAccordion === item.key ? "max-h-96 pb-5" : "max-h-0"
                    }`}
                  >
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {item.content}
                    </p>
                  </div>
                </div>
              ))}
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}

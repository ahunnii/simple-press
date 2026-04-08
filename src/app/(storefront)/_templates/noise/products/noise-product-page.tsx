"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { NoiseVariantSelector } from "./noise-variant-selector";

type ProductAdditionalFields = {
  additionalInformation?: unknown;
  productFeatures?: Array<{ icon: string; text: string }>;
  comingSoon?: boolean;
  productTagline?: string;
} | null;

function parseProductAdditionalFields(raw: unknown): ProductAdditionalFields {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as ProductAdditionalFields;
}

function buildDisplayTrustBadges(
  additional: ProductAdditionalFields,
): Array<{ Icon: LucideIcon; label: string }> {
  const features = additional?.productFeatures ?? [];
  const fromDb = features
    .map((f) => {
      const Icon = getLucideTemplateIcon(f.icon);
      if (!Icon || !f.text?.trim()) return null;
      return { Icon, label: f.text.trim() };
    })
    .filter((b): b is { Icon: LucideIcon; label: string } => b !== null);
  return fromDb;
}

export function NoiseProductDetailsTabs({
  product,
}: {
  product: NonNullable<RouterOutputs["product"]["get"]>;
}) {
  const additional = parseProductAdditionalFields(product.additionalFields);

  return (
    <Tabs defaultValue="overview" className="mx-auto w-full max-w-7xl py-16">
      <TabsList variant="line" className="mx-auto">
        <TabsTrigger value="overview" className="font-sans text-[10px] tracking-[0.25em] uppercase">
          Description
        </TabsTrigger>
        <TabsTrigger value="additional" className="font-sans text-[10px] tracking-[0.25em] uppercase">
          Additional Info
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-8">
        <p className="font-sans text-base leading-relaxed text-muted-foreground whitespace-pre-line">
          {product.description}
        </p>
      </TabsContent>
      <TabsContent value="additional" className="mt-8">
        {additional?.additionalInformation ? (
          <TiptapRenderer
            content={additional.additionalInformation as TiptapJSON}
            className="prose prose-sm max-w-none text-muted-foreground"
          />
        ) : (
          <p className="font-sans text-sm text-muted-foreground">
            No additional information available.
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}

export function NoiseProductPage({ product }: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    inStock,
    variantOptions,
    displayPrice,
    handleAddToCart,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    setSelectedVariantId,
  } = useProduct(product);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [product.slug]);

  const addToCart = () => {
    handleAddToCart();
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const additional = parseProductAdditionalFields(product.additionalFields);
  const trustBadges = buildDisplayTrustBadges(additional);

  return (
    <PageTransition>
      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        {/* Back */}
        <FadeIn direction="none" duration={0.3}>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground mb-8 gap-1.5 rounded-none font-sans text-[10px] tracking-[0.2em] uppercase"
          >
            <Link href="/shop">
              <ArrowLeft className="size-3.5" />
              Back to Shop
            </Link>
          </Button>
        </FadeIn>

        {/* Product Main */}
        <div className="flex flex-col gap-12 lg:flex-row lg:gap-20">
          {/* Image */}
          <FadeIn direction="left" className="flex-1">
            <div className="relative aspect-square w-full overflow-hidden bg-secondary">
              <Image
                src={product.images[0]?.url ?? "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </FadeIn>

          {/* Details */}
          <FadeIn
            direction="right"
            delay={0.15}
            className="flex flex-1 flex-col gap-7"
          >
            {/* Name + tagline */}
            <div>
              <h1 className="font-serif text-3xl font-light leading-tight tracking-tight text-foreground md:text-4xl">
                {product.name}
              </h1>
              {additional?.productTagline && (
                <p className="mt-2 font-sans text-sm text-muted-foreground">
                  {additional.productTagline}
                </p>
              )}
            </div>

            {/* Price */}
            <p className="font-sans text-2xl font-medium text-foreground">
              {formatPrice(displayPrice)}
            </p>

            <Separator />

            {/* Add to cart / variants */}
            {Object.keys(variantOptions).length > 0 ? (
              <NoiseVariantSelector
                product={product}
                setSelectedVariantId={setSelectedVariantId}
              />
            ) : additional?.comingSoon ? (
              <div className="border border-border bg-secondary px-5 py-4">
                <p className="font-sans text-xs tracking-[0.2em] uppercase text-foreground">
                  Coming Soon
                </p>
                <p className="mt-1 font-sans text-sm text-muted-foreground">
                  This piece isn&apos;t available yet. Check back soon.
                </p>
              </div>
            ) : !inStock ? (
              <Button
                size="lg"
                disabled
                className="w-full rounded-none font-sans text-[10px] tracking-[0.25em] uppercase"
              >
                Sold Out
              </Button>
            ) : (
              <>
                {canAddMore && (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* Quantity */}
                    <div className="flex items-center border border-border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 rounded-none"
                        onClick={handleDecrement}
                        disabled={quantity <= 1}
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <span className="w-11 text-center font-sans text-sm font-medium text-foreground">
                        {quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 rounded-none"
                        onClick={handleIncrement}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>

                    <Button
                      size="lg"
                      onClick={addToCart}
                      className="flex-1 rounded-none font-sans text-[10px] tracking-[0.25em] uppercase"
                    >
                      {isAdded ? (
                        <>
                          <Check className="mr-2 h-3.5 w-3.5" />
                          Added to Cart
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="mr-2 size-4" />
                          Add to Cart — {formatPrice(displayPrice)}
                        </>
                      )}
                    </Button>
                  </div>
                )}
                {!canAddMore && inStock && (
                  <p className="font-sans text-xs text-amber-600">
                    Maximum available quantity in cart
                  </p>
                )}
                {product.trackInventory &&
                  product.allowBackorders &&
                  (product.inventoryQty ?? 0) === 0 && (
                    <p className="font-sans text-xs text-muted-foreground">
                      Backordered — ships when available
                    </p>
                  )}
              </>
            )}

            {/* Trust badges */}
            {trustBadges.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {trustBadges.map((badge, i) => (
                  <div
                    key={`${badge.label}-${i}`}
                    className="flex items-center gap-2 border border-border px-3 py-2"
                  >
                    <badge.Icon className="size-3.5 text-muted-foreground" />
                    <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                      {badge.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </FadeIn>
        </div>

        {/* Description tabs */}
        <NoiseProductDetailsTabs product={product} />

        {/* Related products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div className="mb-20">
            <FadeIn>
              <p className="mb-2 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
                You Might Also Like
              </p>
              <h2 className="font-serif text-2xl font-light text-foreground">
                More from the Collection
              </h2>
            </FadeIn>
            <StaggerContainer
              className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2"
              staggerDelay={0.1}
            >
              {relatedProducts.map((p) => (
                <StaggerItem key={p.id}>
                  <Link
                    href={`/shop/${p.slug}`}
                    className="group flex gap-5 border-b border-border py-5 transition-opacity hover:opacity-70"
                  >
                    <div className="relative size-20 shrink-0 overflow-hidden bg-secondary">
                      <Image
                        src={p.images[0]?.url ?? "/placeholder.svg"}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="font-serif text-base font-light text-foreground">
                        {p.name}
                      </h3>
                      <p className="line-clamp-2 font-sans text-xs text-muted-foreground">
                        {p.description}
                      </p>
                      <span className="mt-auto font-sans text-sm font-medium text-foreground">
                        {formatPrice(p.price)}
                      </span>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        )}
      </section>
    </PageTransition>
  );
}

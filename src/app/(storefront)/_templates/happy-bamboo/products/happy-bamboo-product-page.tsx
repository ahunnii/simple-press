"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Droplets,
  Leaf,
  Minus,
  Plus,
  Shield,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { HappyBambooVariantSelector } from "./happy-bamboo-variant-selector";

type ProductAdditionalFields = {
  additionalInformation?: unknown;
  productFeatures?: Array<{ icon: string; text: string }>;
  comingSoon?: boolean;
  productTagline?: string;
} | null;

function parseProductAdditionalFields(raw: unknown): ProductAdditionalFields {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  return raw as ProductAdditionalFields;
}

export function HappyBambooProductDetailsTabs({
  product,
}: {
  product: NonNullable<RouterOutputs["product"]["get"]>;
}) {
  const additional = parseProductAdditionalFields(product.additionalFields);

  return (
    <Tabs
      defaultValue="overview"
      className="mx-auto w-full max-w-7xl py-12 md:py-20"
    >
      <TabsList variant="line" className="mx-auto">
        <TabsTrigger value="overview">Description</TabsTrigger>
        <TabsTrigger value="analytics">Additional Information</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
            {/* <CardDescription>
              View your key metrics and recent project activity. Track progress
              across all your active projects.
            </CardDescription> */}
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            <p className="text-muted-foreground mt-3 text-lg leading-relaxed whitespace-pre-line">
              {product?.description}
            </p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="analytics">
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            {/* <CardDescription>
              Track performance and user engagement metrics. Monitor trends and
              identify growth opportunities.
            </CardDescription> */}
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {additional?.additionalInformation ? (
              <TiptapRenderer
                content={additional.additionalInformation as TiptapJSON}
                className="prose prose-sm dark:prose-invert max-w-none"
              />
            ) : (
              <p>No additional information available.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

// const productDetails: Record<string, { highlights: string[]; specs: Record<string, string> }> = {
//   'bamboo-luxe-12': {
//     highlights: [
//       'Ultra-soft 3-ply sheets for a premium feel',
//       '300 sheets per roll -- lasts longer than standard rolls',
//       'Breaks down easily in all septic systems',
//       'Free from chlorine bleach, dyes, inks, and fragrances',
//       'Wrapped in plastic-free, recyclable paper packaging',
//     ],
//     specs: {
//       'Material': '100% Bamboo Fiber',
//       'Ply Count': '3-Ply',
//       'Sheets Per Roll': '300',
//       'Roll Count': '12',
//       'Septic Safe': 'Yes',
//       'Hypoallergenic': 'Yes',
//       'Packaging': 'Plastic-free, recyclable paper',
//     },
//   },
//   'bamboo-luxe-24': {
//     highlights: [
//       'Same ultra-soft 3-ply bamboo sheets in a bulk-size value pack',
//       'Ideal for families or stocking up for the quarter',
//       'Reduces order frequency and shipping footprint',
//       'Free from chlorine bleach, dyes, inks, and fragrances',
//       'Wrapped in plastic-free, recyclable paper packaging',
//     ],
//     specs: {
//       'Material': '100% Bamboo Fiber',
//       'Ply Count': '3-Ply',
//       'Sheets Per Roll': '300',
//       'Roll Count': '24',
//       'Septic Safe': 'Yes',
//       'Hypoallergenic': 'Yes',
//       'Packaging': 'Plastic-free, recyclable paper',
//     },
//   },
//   'bamboo-starter-kit': {
//     highlights: [
//       'Curated bundle: 6 rolls of toilet paper + 4 rolls of paper towels',
//       'The perfect introduction to bamboo household essentials',
//       'Makes a thoughtful, eco-conscious gift',
//       'All products are tree-free and sustainably sourced',
//       'Packaged in a premium, recyclable gift-style box',
//     ],
//     specs: {
//       'Material': '100% Bamboo Fiber',
//       'Toilet Paper Ply': '3-Ply',
//       'Paper Towel Ply': '2-Ply',
//       'Toilet Paper Rolls': '6',
//       'Paper Towel Rolls': '4',
//       'Septic Safe': 'Yes',
//       'Packaging': 'Recyclable gift box',
//     },
//   },
// }

const trustBadges = [
  { icon: Leaf, label: "100% Tree-Free" },
  { icon: Droplets, label: "Septic Safe" },
  { icon: Shield, label: "Hypoallergenic" },
  { icon: Sparkles, label: "Premium Quality" },
];

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
  if (fromDb.length > 0) return fromDb;
  return trustBadges.map((b) => ({ Icon: b.icon, label: b.label }));
}

export function HappyBambooProductPage({
  product,
}: DefaultProductPageTemplateProps) {
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
  const displayTrustBadges = buildDisplayTrustBadges(additional);

  // const related: (typeof product)[] = [];
  return (
    <PageTransition>
      <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Breadcrumb */}
        <FadeIn direction="none" duration={0.3}>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground mb-6 gap-1"
          >
            <Link href="/shop">
              <ArrowLeft className="size-4" />
              Back to Shop
            </Link>
          </Button>
        </FadeIn>

        {/* Product Main */}
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          {/* Image */}
          <FadeIn direction="left" className="flex-1">
            <div className="bg-secondary relative aspect-square overflow-hidden rounded-2xl">
              <Image
                src={product.images[0]?.url ?? "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {/* {product.badge && (
                <Badge className="bg-primary text-primary-foreground absolute top-4 left-4 px-3 py-1 text-sm">
                  {product.badge}
                </Badge>
              )} */}
            </div>
          </FadeIn>

          {/* Details */}
          <FadeIn
            direction="right"
            delay={0.15}
            className="flex flex-1 flex-col gap-6"
          >
            <div>
              <h1 className="text-foreground font-heading text-3xl font-bold tracking-tight md:text-4xl">
                <span className="text-balance">{product.name}</span>
              </h1>
              {additional?.productTagline && (
                <p className="text-muted-foreground mt-1 text-xl font-medium">
                  {additional.productTagline}
                </p>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-foreground text-3xl font-bold">
                {formatPrice(displayPrice)}
              </span>
              {product.id === "bamboo-luxe-24" && (
                <span className="text-primary text-sm font-medium">
                  Best value per roll
                </span>
              )}
            </div>

            {/* Feature tags */}
            {/* <div className="flex flex-wrap gap-2">
              {product.features.map((feature) => (
                <span
                  key={feature}
                  className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm font-medium"
                >
                  {feature}
                </span>
              ))}
            </div> */}

            <Separator />

            {/* Quantity + Add to Cart */}

            {Object.keys(variantOptions).length > 0 ? (
              <HappyBambooVariantSelector
                product={product}
                setSelectedVariantId={setSelectedVariantId}
              />
            ) : additional?.comingSoon ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-950">
                <p className="font-semibold text-amber-700 dark:text-amber-300">
                  Coming Soon
                </p>
                <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                  This product isn&apos;t available yet. Check back later!
                </p>
              </div>
            ) : !inStock ? (
              <Button size="lg" disabled className="flex">
                Out of Stock
              </Button>
            ) : (
              <>
                {canAddMore && (
                  <>
                    {/* Quantity Selector */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="border-border flex items-center justify-between gap-1 rounded-lg border">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10"
                          onClick={() => handleDecrement()}
                          disabled={quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-4" />
                        </Button>
                        <span className="text-foreground w-10 text-center text-base font-semibold">
                          {quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10"
                          onClick={() => handleIncrement()}
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                      <Button
                        size="lg"
                        onClick={addToCart}
                        className="flex"
                        // className="flex-1 gap-2 sm:flex-none"
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-4 w-4" />
                            Added to Cart
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="size-5" />
                            Add to Cart - {formatPrice(displayPrice)}
                          </>
                        )}
                      </Button>
                    </div>
                    {product.trackInventory &&
                      product.allowBackorders &&
                      (product.inventoryQty ?? 0) === 0 && (
                        <p className="text-muted-foreground text-sm">
                          Backordered — ships when available
                        </p>
                      )}
                  </>
                )}

                {!canAddMore && inStock && (
                  <p className="mt-3 text-center text-sm text-amber-500">
                    You have the maximum available quantity in your cart
                  </p>
                )}
              </>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-3">
              {displayTrustBadges.map((badge, i) => (
                <div
                  key={`${badge.label}-${i}`}
                  className="bg-secondary/60 flex items-center gap-2 rounded-lg px-3 py-2"
                >
                  <badge.Icon className="text-primary size-4" />
                  <span className="text-secondary-foreground text-xs font-medium">
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
        <HappyBambooProductDetailsTabs product={product} />

        {/* Highlights & Specs */}
        {/* {details && (
          <div className="mt-16 flex flex-col gap-12 lg:flex-row lg:gap-16">
            <FadeIn direction="up" delay={0.1} className="flex-1">
              <h2 className="text-foreground font-heading text-2xl font-bold">
                Why You Will Love It
              </h2>
              <ul className="mt-6 flex flex-col gap-3">
                {details.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="text-primary mt-0.5 size-5 shrink-0" />
                    <span className="text-muted-foreground text-sm leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </FadeIn>

            <FadeIn direction="up" delay={0.2} className="flex-1">
              <h2 className="text-foreground font-heading text-2xl font-bold">
                Product Specifications
              </h2>
              <div className="divide-border border-border mt-6 flex flex-col divide-y overflow-hidden rounded-xl border">
                {Object.entries(details.specs).map(([key, value]) => (
                  <div
                    key={key}
                    className="even:bg-secondary/30 flex justify-between px-4 py-3 text-sm"
                  >
                    <span className="text-foreground font-medium">{key}</span>
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        )} */}

        {/* Other Products */}
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
            {relatedProducts?.map((p) => (
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
                    <span className="text-foreground mt-auto text-lg font-bold">
                      {formatPrice(p.price)}
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            ))}
            {relatedProducts?.length === 0 && (
              <div className="col-span-full text-center">
                <p className="text-muted-foreground">
                  No related products found
                </p>
              </div>
            )}
          </StaggerContainer>
        </div>
      </section>
    </PageTransition>
  );
}

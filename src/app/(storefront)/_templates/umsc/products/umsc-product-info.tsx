"use client";

import Link from "next/link";
import { Check, Heart } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { computeSavingsLabel } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { useProduct } from "~/hooks/use-product";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";
import { ProductGalleryVertical } from "~/app/(storefront)/_components/product-page/product-gallery-vertical-sticky";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";

import { UmscAccordion, UmscAccordionItem } from "../shared/umsc-accordion";
import { UmscSection } from "../shared/umsc-section";
import { UmscVariantSelector } from "./umsc-variant-selector";

type Product = NonNullable<RouterOutputs["product"]["get"]>;

type Props = {
  product: Product;
  collectionName?: string;
  shippingDescription: string;
  questionDescription: string;
  globalTrustBadges: { icon?: unknown; label: string }[];
};

/**
 * UmscProductInfo — design.md "products.main". Sticky gallery (1.05fr) +
 * info column (.95fr): collection line, Marcellus title, gold-ink price
 * (sale = purple badge + struck compare), short description, purchase
 * actions (variant pills or a quantity stepper), purple-outline wishlist
 * heart, trust badges, and the Shipping/Returns/Ask-a-question accordion.
 * `useProduct` owns every price/variant/cart concern per the build contract.
 */
export function UmscProductInfo({
  product,
  collectionName,
  shippingDescription,
  questionDescription,
  globalTrustBadges,
}: Props) {
  const {
    formatPrice,
    displayPrice,
    additionalFields,
    isOnSale,
    displayCompareAtPrice,
    displayTrustBadges,
    selectedVariantId,
    setSelectedVariantId,
    variantOptions,
    inStock,
    canAddMore,
    quantity,
    handleIncrement,
    handleDecrement,
    handleAddToCart,
    justAdded,
  } = useProduct(product);

  const trustBadges =
    displayTrustBadges.length > 0 ? displayTrustBadges : globalTrustBadges;
  const hasVariants = Object.keys(variantOptions).length > 0;
  const comingSoon = !!additionalFields?.comingSoon;

  return (
    <UmscSection
      tone="paper"
      aria-label="Product"
      padded={false}
      style={{ padding: "1.5rem var(--umsc-section-pad-x) 5rem" }}
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <ProductGalleryVertical
          images={product.images}
          productName={product.name}
          enableLightbox
          styleProps={{
            containerClassName: "lg:sticky lg:top-24 lg:self-start",
            singleImageContainerClassName:
              "rounded-none bg-[var(--umsc-cream)]",
            unselectedButtonClassName:
              "rounded-none border-[var(--umsc-line)] bg-[var(--umsc-cream)]",
            selectedButtonClassName:
              "rounded-none border-[var(--umsc-gold-ink)] ring-[var(--umsc-gold-ink)] bg-[var(--umsc-cream)]",
          }}
        />

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {collectionName && (
              <span className="umsc-sans text-[12px] font-medium tracking-[0.12em] text-[var(--umsc-gold-ink)] uppercase">
                {collectionName}
              </span>
            )}
            <h1 className="umsc-serif text-[clamp(30px,4vw,40px)] leading-[1.1] font-normal text-[var(--umsc-ink)]">
              {product.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              {isOnSale && displayCompareAtPrice && (
                <span className="sr-only">Sale price </span>
              )}
              <span className="umsc-tabular umsc-sans text-[22px] font-medium text-[var(--umsc-gold-ink)]">
                {formatPrice(displayPrice)}
              </span>
              {isOnSale && displayCompareAtPrice && (
                <>
                  <span className="sr-only">Original price </span>
                  <span className="umsc-tabular umsc-sans text-[16px] text-[var(--umsc-muted)] line-through">
                    {formatPrice(displayCompareAtPrice)}
                  </span>
                  <span className="umsc-sans inline-flex items-center bg-[var(--umsc-purple)] px-2 py-1 text-[10px] font-medium tracking-[0.14em] text-white uppercase">
                    {computeSavingsLabel(displayPrice, displayCompareAtPrice)}
                  </span>
                </>
              )}
            </div>
            {product.description && (
              <p className="umsc-sans max-w-[52ch] text-[15px] leading-[1.7] text-[var(--umsc-muted)]">
                {product.description}
              </p>
            )}
          </div>

          {/* Purchase actions */}
          {comingSoon ? (
            <div className="border border-[var(--umsc-line)] bg-[var(--umsc-cream)] px-5 py-4">
              <p className="umsc-serif text-[17px] text-[var(--umsc-ink)]">
                Coming Soon
              </p>
              <p className="umsc-sans mt-1 text-[14px] text-[var(--umsc-muted)]">
                This product isn&apos;t available yet — check back soon.
              </p>
            </div>
          ) : hasVariants ? (
            <UmscVariantSelector
              product={product}
              selectedVariantId={selectedVariantId}
              setSelectedVariantId={setSelectedVariantId}
              wishlistSlot={
                <UmscWishlistHeart product={product} price={displayPrice} />
              }
            />
          ) : !inStock ? (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                aria-disabled="true"
                onClick={(e) => e.preventDefault()}
                className="umsc-btn h-12 w-full cursor-not-allowed border border-[var(--umsc-line)] bg-transparent text-[var(--umsc-muted)]"
              >
                Out of Stock
              </button>
              <NotifyMeForm
                productId={product.id}
                message="Get notified when it's back in stock."
                messageClassName="text-sm text-[var(--umsc-muted)]"
                inputClassName="border-[var(--umsc-line)] text-[var(--umsc-ink)]"
                buttonClassName="border-[var(--umsc-ink)] text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--umsc-ink)]"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {canAddMore ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    role="group"
                    aria-label="Quantity"
                    className="inline-flex h-12 w-[130px] shrink-0 items-center border border-[var(--umsc-line)]"
                  >
                    <button
                      type="button"
                      onClick={handleDecrement}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                      className="flex h-full flex-1 items-center justify-center text-[18px] font-light text-[var(--umsc-ink)] disabled:opacity-30"
                    >
                      <span aria-hidden="true">−</span>
                    </button>
                    <span
                      aria-live="polite"
                      aria-atomic="true"
                      className="umsc-tabular umsc-sans w-10 text-center text-[14px] font-medium text-[var(--umsc-ink)]"
                    >
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={handleIncrement}
                      aria-label="Increase quantity"
                      className="flex h-full flex-1 items-center justify-center text-[18px] font-light text-[var(--umsc-ink)]"
                    >
                      <span aria-hidden="true">+</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="umsc-btn umsc-btn-gold h-12 min-w-0 flex-1 basis-full sm:basis-auto"
                  >
                    {justAdded ? (
                      <>
                        <Check className="size-4" aria-hidden="true" />
                        Added
                      </>
                    ) : (
                      <>Add to cart · {formatPrice(displayPrice)}</>
                    )}
                  </button>

                  <UmscWishlistHeart product={product} price={displayPrice} />

                  <span
                    className="sr-only"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {justAdded ? "Added to cart" : ""}
                  </span>
                </div>
              ) : (
                <p className="umsc-sans text-[14px] text-[var(--umsc-muted)]">
                  You have the maximum available quantity in your cart.
                </p>
              )}

              {product.trackInventory && (product.inventoryQty ?? 0) > 0 && (
                <p className="umsc-sans text-[12px] text-[var(--umsc-muted)]">
                  {product.inventoryQty} available
                </p>
              )}
              {product.trackInventory &&
                product.allowBackorders &&
                (product.inventoryQty ?? 0) === 0 && (
                  <p className="umsc-sans text-[12px] text-[var(--umsc-muted)]">
                    Backordered — ships when available
                  </p>
                )}
            </div>
          )}

          {/* Trust badges */}
          {trustBadges.length > 0 && (
            <div className="umsc-sans flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[var(--umsc-muted)]">
              {trustBadges.map((badge) => (
                <span
                  key={badge.label}
                  className="inline-flex items-center gap-1.5"
                >
                  <Check
                    className="size-3.5 shrink-0 text-[var(--umsc-gold-ink)]"
                    aria-hidden="true"
                  />
                  {badge.label}
                </span>
              ))}
            </div>
          )}

          {/* Shipping & pickup / Returns / Ask a question — global.product
              copy (chrome-owned field group; no page="products" fields of
              our own, so the hotspot targets "global.product" directly per
              the build brief). `UmscAccordion` doesn't forward arbitrary
              props, so the hotspot attribute lives on this wrapping div. */}
          <div {...sectionGroupAttr("global", "product")}>
            <h2 className="sr-only">Product details</h2>
            <UmscAccordion className="mt-2">
              {shippingDescription && (
                <UmscAccordionItem title="Shipping & pickup" defaultOpen>
                  <p {...fieldAttr("umsc.global.product-shipping-description")}>
                    {shippingDescription}
                  </p>
                </UmscAccordionItem>
              )}
              <UmscAccordionItem title="Returns">
                <p>
                  Returns are accepted within 30 days of delivery, unused and in
                  original packaging.{" "}
                  <Link
                    href="/refund-policy"
                    className="text-[var(--umsc-gold-ink)] underline underline-offset-[0.18em] hover:text-[var(--umsc-ink)]"
                  >
                    View our return policy
                  </Link>
                  .
                </p>
              </UmscAccordionItem>
              {questionDescription && (
                <UmscAccordionItem title="Ask a question">
                  <p>
                    <span
                      {...fieldAttr("umsc.global.product-question-description")}
                    >
                      {questionDescription}
                    </span>{" "}
                    <Link
                      href="/contact"
                      className="text-[var(--umsc-gold-ink)] underline underline-offset-[0.18em] hover:text-[var(--umsc-ink)]"
                    >
                      Reach out here.
                    </Link>
                  </p>
                </UmscAccordionItem>
              )}
            </UmscAccordion>
          </div>
        </div>
      </div>
    </UmscSection>
  );
}

/** Purple-outline wishlist heart (design.md "products.main"). */
function UmscWishlistHeart({
  product,
  price,
}: {
  product: Product;
  price: number;
}) {
  const { isEnabled } = useStorefrontFlags();
  const { has, toggle } = useWishlist();
  const saved = has(product.id);

  if (!isEnabled("wishlist")) return null;

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={`Save ${product.name} to wishlist`}
      onClick={() =>
        toggle({
          productId: product.id,
          name: product.name,
          slug: product.slug,
          price,
          imageUrl: product.images[0]?.url ?? null,
        })
      }
      className={cn(
        "inline-flex size-12 shrink-0 items-center justify-center border transition-colors",
        saved
          ? "border-[var(--umsc-purple)] bg-[var(--umsc-purple)] text-white"
          : "border-[var(--umsc-purple)] bg-transparent text-[var(--umsc-purple)] hover:bg-[var(--umsc-purple)] hover:text-white",
      )}
    >
      <Heart
        className="size-[18px]"
        fill={saved ? "currentColor" : "none"}
        aria-hidden="true"
      />
    </button>
  );
}

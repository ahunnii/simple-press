"use client";

import { useEffect } from "react";
import { Minus, Plus } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { formatPrice } from "~/lib/prices";
import { useProduct } from "~/hooks/use-product";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

import { PinkProductVariantPills } from "./pink-product-variant-pills";

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
};

/**
 * The buy row: variant pills (if any) → `1px solid ink` stepper → rose
 * add-to-basket → ghost save button → availability line (design.md →
 * Product → "Details"). Entirely DB-driven, no template fields. Uses the
 * shared `useProduct` hook exclusively for price/variant/cart state — never
 * calls `useCart` directly.
 */
export function PinkProductActions({ product }: Props) {
  const {
    inStock,
    variantOptions,
    selectedOptions,
    selectedVariant,
    handleOptionSelect,
    displayPrice,
    displayCompareAtPrice,
    isOnSale,
    handleAddToCart,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    remainingStock,
    isInventoryTracked,
    showLowStockWarning,
    justAdded,
    additionalFields,
  } = useProduct(product);

  const { setVariantImageUrl } = useVariantImage();

  useEffect(() => {
    setVariantImageUrl(selectedVariant?.imageUrl ?? null);
  }, [selectedVariant?.imageUrl, setVariantImageUrl]);

  if (additionalFields?.comingSoon) {
    return (
      <div className="flex flex-col gap-2 p-5" style={{ background: "var(--pink-panel)" }}>
        <p className="pink-display" style={{ fontSize: "17px", fontWeight: 600 }}>
          Coming soon
        </p>
        <p className="text-[14px]" style={{ color: "var(--pink-muted)" }}>
          This piece isn&apos;t available yet — check back soon.
        </p>
      </div>
    );
  }

  const hasVariants = Object.keys(variantOptions).length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline gap-3" style={{ borderTop: "1px solid var(--pink-ink)", paddingTop: "20px" }}>
        <span className="pink-display" style={{ fontSize: "26px", fontWeight: 600 }}>
          {formatPrice(displayPrice)}
        </span>
        {isOnSale && displayCompareAtPrice && (
          <span className="text-[16px] line-through" style={{ color: "var(--pink-subtle)" }}>
            {formatPrice(displayCompareAtPrice)}
          </span>
        )}
        <span className="text-[13px]" style={{ color: "var(--pink-subtle)" }}>
          Ships in 3–5 days
        </span>
      </div>

      {hasVariants && (
        <PinkProductVariantPills
          variantOptions={variantOptions}
          selectedOptions={selectedOptions}
          onSelect={handleOptionSelect}
        />
      )}

      {!inStock ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            aria-disabled="true"
            onClick={(e) => e.preventDefault()}
            className="w-full cursor-not-allowed py-4 text-[14px] font-semibold"
            style={{ background: "var(--pink-line)", color: "var(--pink-subtle)" }}
          >
            Sold out
          </button>
          <NotifyMeForm
            productId={product.id}
            variantId={selectedVariant?.id}
            message="Get notified when it's back in stock."
            messageClassName="text-[13px]"
            inputClassName="pink-input"
            buttonClassName="pink-btn pink-btn-outline px-4 py-2.5"
          />
        </div>
      ) : (
        <>
          <div className="flex items-stretch gap-3">
            <div className="flex items-center" style={{ border: "1px solid var(--pink-ink)" }}>
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="flex items-center justify-center disabled:opacity-30"
                style={{ width: 44, height: 52 }}
              >
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <span className="w-10 text-center text-[15px]" aria-live="polite" aria-atomic="true">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={!canAddMore}
                aria-label="Increase quantity"
                className="flex items-center justify-center disabled:opacity-30"
                style={{ width: 44, height: 52 }}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canAddMore}
              className="flex flex-1 items-center justify-center px-6 text-[15px] font-semibold transition-colors"
              style={{
                minWidth: 220,
                height: 52,
                background: justAdded ? "var(--pink-ink)" : "var(--pink-rose)",
                border: `1px solid ${justAdded ? "var(--pink-ink)" : "var(--pink-rose)"}`,
                color: "var(--pink-on-accent)",
              }}
            >
              {justAdded ? "Added ✓" : "Add to basket"}
            </button>

            <WishlistButton
              item={{
                productId: product.id,
                name: product.name,
                slug: product.slug,
                price: displayPrice,
                imageUrl: product.images[0]?.url ?? null,
              }}
              className="static flex size-[52px] shrink-0 items-center justify-center border bg-transparent text-[var(--pink-ink)] shadow-none backdrop-blur-none hover:scale-100 hover:border-[var(--pink-rose)] hover:text-[var(--pink-rose)]"
              iconClassName="size-5"
            />
          </div>

          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {justAdded ? `${product.name} added to basket` : ""}
          </div>

          <p className="text-[14px]" style={{ color: "var(--pink-muted)" }}>
            {isInventoryTracked
              ? showLowStockWarning
                ? `${remainingStock} left`
                : "In stock"
              : "Made to order"}
          </p>
        </>
      )}
    </div>
  );
}

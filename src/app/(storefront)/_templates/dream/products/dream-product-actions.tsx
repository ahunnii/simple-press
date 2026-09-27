"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { useProduct } from "~/hooks/use-product";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";
import { SubscribePanel } from "~/app/(storefront)/_components/product/subscribe-panel";

import {
  DREAM_NOTIFY_BUTTON_CLASSNAME,
  DREAM_NOTIFY_INPUT_CLASSNAME,
  DREAM_SUBSCRIBE_CTA_CLASSNAME,
  DREAM_SUBSCRIBE_PANEL_CLASSNAME,
} from "./dream-product-styles";
import { DreamQuantityStepper } from "./dream-quantity-stepper";
import { DreamVariantSelector } from "./dream-variant-selector";

type DreamProductActionsProps = {
  product: DefaultProductPageTemplateProps["product"];
  /**
   * The page's own `useProduct(product)` result — shared rather than
   * re-instantiated so the price above the panel follows the chosen variant.
   */
  state: ReturnType<typeof useProduct>;
  /** Resolved `dream.product.coming-soon-heading`; blank hides the line. */
  comingSoonHeading: string;
  /** Resolved `dream.product.coming-soon-body`; blank hides the line. */
  comingSoonBody: string;
};

/**
 * Inline confirmation after an add. Dream's chrome has no cart icon or
 * drawer (design.md "Chrome › Header: No cart/wishlist"), so this line is the
 * shopper's only route to the cart; it stays up once shown. The wrapper is
 * always mounted so the live region announces the change.
 */
function AddedNotice({ show }: { show: boolean }) {
  return (
    <div aria-live="polite" aria-atomic="true">
      {show ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-[var(--dream-ink)]">
          <Check
            className="size-4 text-[var(--dream-success)]"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span>Added to your cart</span>
          <span aria-hidden="true" className="text-[var(--dream-soft)]">
            ·
          </span>
          <Link href="/cart" className="dream-link font-semibold">
            View cart
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export function DreamProductActions({
  product,
  state,
  comingSoonHeading,
  comingSoonBody,
}: DreamProductActionsProps) {
  const {
    inStock,
    variantOptions,
    handleAddToCart,
    canAddMore,
    handleDecrement,
    handleIncrement,
    quantity,
    setSelectedVariantId,
    selectedVariantId,
    additionalFields,
    remainingStock,
    isInventoryTracked,
  } = state;

  const stockId = useId();
  const [added, setAdded] = useState(false);
  const hasVariants = Object.keys(variantOptions).length > 0;

  // The variant selector keeps its own quantity (useProduct's stays 1 for
  // variant products) — mirror it so SubscribePanel links with the real qty.
  const [variantQuantity, setVariantQuantity] = useState(1);
  const subscribeQuantity = hasVariants ? variantQuantity : quantity;

  const heading = comingSoonHeading.trim();
  const body = comingSoonBody.trim();

  if (additionalFields?.comingSoon) {
    if (!heading && !body) return null;
    return (
      <div className="rounded-[var(--dream-radius-card)] border border-[var(--dream-line)] bg-[var(--dream-white)] px-6 py-5">
        {heading ? (
          <p
            {...fieldAttr("dream.product.coming-soon-heading")}
            className="text-[26px] leading-[1.15]"
            style={{ fontFamily: "var(--font-dream-display)" }}
          >
            {heading}
          </p>
        ) : null}
        {body ? (
          <p
            {...fieldAttr("dream.product.coming-soon-body")}
            className="mt-1.5 text-[15px] text-[var(--dream-soft)]"
          >
            {body}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {hasVariants ? (
        <DreamVariantSelector
          product={product}
          setSelectedVariantId={setSelectedVariantId}
          onQuantityChange={setVariantQuantity}
          onAdded={() => setAdded(true)}
        />
      ) : !inStock ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            aria-disabled="true"
            className="dream-btn h-12 w-full cursor-not-allowed opacity-50 hover:translate-y-0 hover:shadow-none sm:w-auto"
          >
            Sold out
          </button>
          <NotifyMeForm
            productId={product.id}
            message="Get notified when it's back in stock."
            messageClassName="text-[14px] text-[var(--dream-soft)]"
            inputClassName={DREAM_NOTIFY_INPUT_CLASSNAME}
            buttonClassName={DREAM_NOTIFY_BUTTON_CLASSNAME}
          />
        </div>
      ) : canAddMore ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <DreamQuantityStepper
              value={quantity}
              onDecrement={handleDecrement}
              onIncrement={handleIncrement}
              canDecrement={quantity > 1}
              canIncrement={quantity < remainingStock}
              describedBy={isInventoryTracked ? stockId : undefined}
            />
            <button
              type="button"
              onClick={() => {
                handleAddToCart();
                setAdded(true);
              }}
              className="dream-btn h-12 min-w-[12rem] flex-1"
            >
              Add to cart
            </button>
          </div>
          {isInventoryTracked && !product.allowBackorders ? (
            <p id={stockId} className="text-[14px] text-[var(--dream-soft)]">
              {remainingStock > 1 ? `${remainingStock} available` : "Last one"}
            </p>
          ) : null}
          {product.trackInventory &&
          product.allowBackorders &&
          (product.inventoryQty ?? 0) === 0 ? (
            <p className="text-[14px] text-[var(--dream-soft)]">
              Backordered — ships when available
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-[15px] text-[var(--dream-soft)]">
          You have all available stock of this item in your cart.{" "}
          <Link href="/cart" className="dream-link font-semibold">
            View cart
          </Link>
        </p>
      )}

      <AddedNotice show={added} />

      <SubscribePanel
        product={product}
        selectedVariantId={selectedVariantId}
        quantity={subscribeQuantity}
        available={inStock}
        className={DREAM_SUBSCRIBE_PANEL_CLASSNAME}
        ctaClassName={DREAM_SUBSCRIBE_CTA_CLASSNAME}
      />
    </div>
  );
}

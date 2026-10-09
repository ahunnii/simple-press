"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";

import type { CartItem } from "~/providers/cart-context";
import { formatPrice } from "~/lib/prices";
import { cartItemId, useCart } from "~/providers/cart-context";

type GloveCartItemProps = {
  item: CartItem;
  /** Chains/charms picked for this line on its product page, nested under it. */
  addOns?: CartItem[];
  /** This line plus its add-ons, shown under them when there are any. */
  groupTotal?: number;
  /** Called when the product link is followed (closes the drawer). */
  onNavigate?: () => void;
};

function ProductName({
  item,
  onNavigate,
}: {
  item: CartItem;
  onNavigate?: () => void;
}) {
  return item.productSlug ? (
    <Link
      href={`/shop/${item.productSlug}`}
      onClick={onNavigate}
      className="transition-colors hover:text-[var(--glove-primary)]"
    >
      {item.productName}
    </Link>
  ) : (
    item.productName
  );
}

function LinePrice({ item }: { item: CartItem }) {
  const { price, compareAtPrice, quantity } = item;
  const isOnSale =
    compareAtPrice != null && compareAtPrice > 0 && compareAtPrice > price;
  return (
    <>
      {isOnSale ? (
        <span className="mr-1.5 font-normal text-[var(--glove-muted)] line-through">
          <span className="sr-only">Original price </span>
          {formatPrice(compareAtPrice * quantity)}
        </span>
      ) : null}
      {formatPrice(price * quantity)}
    </>
  );
}

function QtyControl({
  item,
  size,
}: {
  item: CartItem;
  /** Button edge in px: 36 for gloves, 32 inside the add-on panel. */
  size: "md" | "sm";
}) {
  const { updateQuantity } = useCart();
  const { productId, variantId, productName, quantity, maxInventory } = item;
  const scope = item.addOnFor ?? null;
  const atMax = maxInventory !== undefined && quantity >= maxInventory;
  const button = size === "md" ? "size-9" : "size-8";
  return (
    <div className="inline-flex items-center rounded-[3px] border border-[var(--glove-line)] bg-[var(--glove-paper)]">
      <button
        type="button"
        onClick={() =>
          updateQuantity(productId, variantId, quantity - 1, scope)
        }
        disabled={quantity <= 1}
        aria-label={`Decrease quantity of ${productName}`}
        className={`inline-flex ${button} items-center justify-center text-[var(--glove-ink)] transition-colors hover:text-[var(--glove-primary)] disabled:opacity-40`}
      >
        <Minus className="size-3.5" aria-hidden="true" />
      </button>
      <span
        className="w-8 text-center text-[14px] text-[var(--glove-ink)]"
        aria-live="polite"
        aria-atomic="true"
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={() =>
          updateQuantity(productId, variantId, quantity + 1, scope)
        }
        disabled={atMax}
        aria-label={`Increase quantity of ${productName}`}
        className={`inline-flex ${button} items-center justify-center text-[var(--glove-ink)] transition-colors hover:text-[var(--glove-primary)] disabled:opacity-40`}
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Cart drawer line: 64px image, name, variant, qty stepper, line price,
 * remove. A glove's chains/charms sit in a mist panel under it with a
 * "Total with add-ons" line; the glove's remove takes them with it, and each
 * add-on keeps its own.
 */
export function GloveCartItem({
  item,
  addOns = [],
  groupTotal,
  onNavigate,
}: GloveCartItemProps) {
  const { removeItem, removeItemWithAddOns } = useCart();
  const { productId, variantId, productName, variantName, imageUrl } = item;
  const hasAddOns = addOns.length > 0;
  const panelId = `glove-drawer-addons-${cartItemId(item)}`;

  return (
    <li className="border-b border-[var(--glove-line)] py-4">
      <div className="flex gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden bg-[var(--glove-wash)]">
          <Image
            src={imageUrl ?? "/placeholder.svg"}
            alt=""
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="glove-display text-[14px] leading-snug font-medium text-[var(--glove-ink)]">
                <ProductName item={item} onNavigate={onNavigate} />
              </p>
              {variantName ? (
                <p className="text-[13px] text-[var(--glove-muted)]">
                  {variantName}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() =>
                hasAddOns
                  ? removeItemWithAddOns(productId, variantId)
                  : removeItem(productId, variantId, item.addOnFor ?? null)
              }
              aria-label={
                hasAddOns
                  ? `Remove ${productName} and its add-ons from cart`
                  : `Remove ${productName} from cart`
              }
              className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center text-[var(--glove-muted)] transition-colors hover:text-[var(--glove-alert)]"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <QtyControl item={item} size="md" />
            <p className="glove-body text-[15px] font-bold text-[var(--glove-ink)]">
              <LinePrice item={item} />
            </p>
          </div>
        </div>
      </div>

      {hasAddOns ? (
        <div className="mt-3 ml-[76px] rounded-[var(--glove-radius-card)] border border-[var(--glove-mist-line)] bg-[var(--glove-mist)] px-3 pt-2.5">
          <p
            id={panelId}
            className="glove-display m-0 text-[12px] font-medium text-[var(--glove-muted)]"
          >
            Added to this glove
          </p>
          <ul aria-labelledby={panelId} className="m-0 list-none p-0">
            {addOns.map((addOn) => (
              <li
                key={cartItemId(addOn)}
                className="flex gap-2.5 border-b border-[var(--glove-mist-line)] py-2.5 last:border-b-0"
              >
                <div className="relative size-10 shrink-0 overflow-hidden bg-[var(--glove-paper)]">
                  <Image
                    src={addOn.imageUrl ?? "/placeholder.svg"}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="glove-display text-[13px] leading-snug font-medium text-[var(--glove-ink)]">
                        <ProductName item={addOn} onNavigate={onNavigate} />
                      </p>
                      {addOn.variantName ? (
                        <p className="text-[12px] text-[var(--glove-muted)]">
                          {addOn.variantName}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        removeItem(
                          addOn.productId,
                          addOn.variantId,
                          addOn.addOnFor ?? null,
                        )
                      }
                      aria-label={`Remove ${addOn.productName} from cart`}
                      className="-mt-2 -mr-2.5 inline-flex size-11 shrink-0 items-center justify-center text-[var(--glove-muted)] transition-colors hover:text-[var(--glove-alert)]"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <QtyControl item={addOn} size="sm" />
                    <p className="glove-body text-[14px] font-bold text-[var(--glove-ink)]">
                      <LinePrice item={addOn} />
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {groupTotal !== undefined ? (
            <p className="m-0 flex items-baseline justify-between gap-3 border-t border-[var(--glove-mist-line)] py-2.5 text-[var(--glove-ink)]">
              <span className="glove-display text-[13px] font-medium">
                Total with add-ons
              </span>
              <span className="glove-body text-[15px] font-bold">
                {formatPrice(groupTotal)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

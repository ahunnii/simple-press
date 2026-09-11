"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { ShippingConfig } from "~/lib/shipping-utils";
import type { CartItem } from "~/providers/cart-context";
import { formatPrice } from "~/lib/prices";
import {
  calculateShipping,
  getAmountUntilFreeShipping,
  getFreeShippingProgress,
  SHIPPING_TYPES,
} from "~/lib/shipping-utils";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "~/components/ui/sheet";
import { useCart } from "~/providers/cart-context";

type BambooCartDrawerProps = {
  shippingConfig: ShippingConfig;
};

const quantityButtonClass =
  "size-9 rounded-full border border-[var(--bam-hairline)] text-[var(--bam-forest)] hover:bg-[var(--bam-cream-deep)] hover:text-[var(--bam-forest-deep)] disabled:opacity-40";

/** One line item inside the drawer. Kept local so the drawer owns its look. */
function BambooDrawerItem({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="flex gap-4 border-b border-[var(--bam-hairline)] py-4 last:border-b-0">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-(--radius) bg-[var(--bam-cream-deep)]">
        <Image
          src={item.imageUrl ?? "/placeholder.svg"}
          alt={item.productName}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading text-sm leading-snug text-[var(--bam-forest-deep)]">
            {item.productName}
            {item.variantName ? ` — ${item.variantName}` : ""}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-[var(--bam-forest)]/60 hover:bg-transparent hover:text-[var(--bam-forest-deep)]"
            onClick={() => removeItem(item.productId, item.variantId)}
            aria-label={`Remove ${item.productName} from cart`}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <p className="mt-0.5 text-xs text-[var(--bam-forest)]/70">
          {formatPrice(item.price)} each
        </p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={quantityButtonClass}
              onClick={() =>
                updateQuantity(
                  item.productId,
                  item.variantId,
                  item.quantity - 1,
                )
              }
              disabled={item.quantity <= 1}
              aria-label={`Decrease quantity of ${item.productName}`}
            >
              <Minus className="size-3" aria-hidden="true" />
            </Button>
            <span
              className="w-6 text-center text-sm font-medium text-[var(--bam-forest-deep)]"
              aria-live="polite"
              aria-atomic="true"
            >
              {item.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className={quantityButtonClass}
              onClick={() =>
                updateQuantity(
                  item.productId,
                  item.variantId,
                  item.quantity + 1,
                )
              }
              aria-label={`Increase quantity of ${item.productName}`}
            >
              <Plus className="size-3" aria-hidden="true" />
            </Button>
          </div>
          <span className="font-heading text-sm text-[var(--bam-forest-deep)]">
            {formatPrice(item.price * item.quantity)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * BambooCartDrawer — the right-side mini cart, opened by the header's cart
 * button (`useCart().setIsOpen`). Three bands like the mobile nav: forest
 * header, cream item list, cream-deep summary footer with the forest pill CTA.
 */
export function BambooCartDrawer({ shippingConfig }: BambooCartDrawerProps) {
  const { items, itemCount, subtotal, isOpen, setIsOpen } = useCart();
  const reducedMotion = useReducedMotion();

  // The sheet portals to document.body by default, which escapes the .bamboo
  // scope class — every var(--bam-*) token and font variable would resolve to
  // nothing. Portal into the template wrapper instead so the drawer inherits
  // tokens, fonts, and any owner theme overrides.
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setContainer(document.querySelector<HTMLElement>("div.bamboo"));
  }, []);

  // Zone+weight rates depend on the destination address, which isn't known in
  // the cart — defer to checkout rather than showing a misleading "Free".
  const isZoneWeight =
    shippingConfig.shippingType === SHIPPING_TYPES.ZONE_WEIGHT;
  const shipping = isZoneWeight
    ? 0
    : calculateShipping(subtotal, shippingConfig);
  const estimatedOrderTotal = subtotal + shipping;
  const untilFree = getAmountUntilFreeShipping(subtotal, shippingConfig);
  const progress = getFreeShippingProgress(subtotal, shippingConfig);
  const showProgress =
    shippingConfig.shippingType === SHIPPING_TYPES.FLAT_RATE_WITH_THRESHOLD &&
    progress !== null &&
    untilFree !== null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        side="right"
        container={container}
        className="flex w-full flex-col gap-0 border-l border-[var(--bam-forest)]/20 bg-[var(--bam-cream)] p-0 sm:max-w-md [&>button]:text-[var(--bam-cream)] [&>button]:opacity-90 [&>button]:hover:bg-white/15 [&>button]:hover:opacity-100"
      >
        {/* Band 1 — forest header */}
        <div className="bg-[var(--bam-forest)] pt-12 pr-14 pb-5 pl-5">
          <SheetTitle className="flex flex-col gap-0.5 text-left font-normal text-[var(--bam-cream)]">
            <span className="font-sans text-xs font-medium tracking-widest text-[var(--bam-gold-soft)] uppercase">
              Your Basket
            </span>
            <span className="font-heading text-xl">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Review the products in your cart, adjust quantities, and continue to
            checkout.
          </SheetDescription>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-[var(--bam-cream-deep)]">
              <ShoppingBag
                className="size-7 text-[var(--bam-forest)]/60"
                aria-hidden="true"
              />
            </span>
            <p className="font-heading text-lg text-[var(--bam-forest-deep)]">
              Your cart is empty
            </p>
            <p className="max-w-xs text-sm text-[var(--bam-forest)]/70">
              Everything we make is tree-free, chemical-free and ready to ship.
            </p>
            <Button
              className="mt-2 rounded-full bg-[var(--bam-forest)] px-6 text-[var(--bam-cream)] hover:bg-[var(--bam-forest-deep)]"
              onClick={() => setIsOpen(false)}
              asChild
            >
              <Link href="/shop">Continue Shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Band 2 — cream item list */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={`${item.productId}-${item.variantId ?? "base"}`}
                    layout
                    initial={
                      reducedMotion
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0, x: 20 }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    exit={
                      reducedMotion
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0, x: -20 }
                    }
                    transition={reducedMotion ? { duration: 0 } : undefined}
                  >
                    <BambooDrawerItem item={item} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Band 3 — cream-deep summary */}
            <div className="border-t border-[var(--bam-hairline)] bg-[var(--bam-cream-deep)] px-5 py-5">
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--bam-forest)]/75">
                    Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
                  </span>
                  <span className="font-medium text-[var(--bam-forest-deep)]">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--bam-forest)]/75">Shipping</span>
                  <span className="font-medium text-[var(--bam-forest-deep)]">
                    {isZoneWeight
                      ? "Calculated at checkout"
                      : shipping === 0
                        ? "Free"
                        : formatPrice(shipping)}
                  </span>
                </div>
                {showProgress && untilFree !== null && progress !== null && (
                  <div className="flex flex-col gap-2">
                    <Progress
                      value={progress * 100}
                      className="h-1.5"
                      aria-label={`Free shipping progress: ${Math.round(progress * 100)}% of the way there`}
                    />
                    <p className="text-xs text-[var(--bam-forest)]/70">
                      Add {formatPrice(untilFree)} more for free shipping
                    </p>
                  </div>
                )}
                <div className="mt-1 flex items-baseline justify-between border-t border-[var(--bam-hairline)] pt-3">
                  <span className="text-sm font-semibold text-[var(--bam-forest-deep)]">
                    Estimated total
                  </span>
                  <span className="font-heading text-xl text-[var(--bam-forest-deep)]">
                    {formatPrice(estimatedOrderTotal)}
                  </span>
                </div>
              </div>
              <Button
                className="mt-5 w-full rounded-full bg-[var(--bam-forest)] text-[var(--bam-cream)] hover:bg-[var(--bam-forest-deep)]"
                size="lg"
                asChild
                onClick={() => setIsOpen(false)}
              >
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
              <Button
                variant="ghost"
                className="mt-1 w-full text-sm text-[var(--bam-forest)]/75 hover:bg-transparent hover:text-[var(--bam-forest-deep)]"
                onClick={() => setIsOpen(false)}
                asChild
              >
                <Link href="/cart">View full cart</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

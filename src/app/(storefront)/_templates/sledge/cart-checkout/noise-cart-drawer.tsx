"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { ShippingConfig } from "~/lib/shipping-utils";
import { formatPrice } from "~/lib/prices";
import {
  getAmountUntilFreeShipping,
  getFreeShippingProgress,
  SHIPPING_TYPES,
} from "~/lib/shipping-utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { useCart } from "~/providers/cart-context";

type NoiseCartDrawerProps = {
  shippingConfig: ShippingConfig;
};

export function NoiseCartDrawer({ shippingConfig }: NoiseCartDrawerProps) {
  const { items, subtotal, isOpen, setIsOpen, updateQuantity, removeItem } =
    useCart();

  const untilFree = getAmountUntilFreeShipping(subtotal, shippingConfig);
  const progress = getFreeShippingProgress(subtotal, shippingConfig);
  const showFreeBar =
    shippingConfig.shippingType === SHIPPING_TYPES.FLAT_RATE_WITH_THRESHOLD &&
    progress !== null &&
    untilFree !== null &&
    untilFree > 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex w-full flex-col rounded-none border-l border-[var(--sl-border)] bg-[var(--sl-cream)] p-0 text-[var(--sl-ink)] sm:max-w-[26rem]">
        <SheetHeader className="flex-none border-b border-[var(--sl-border)]">
          <SheetTitle asChild>
            <div className="flex items-center justify-between bg-[var(--sl-cream)] px-6 py-5">
              <span className="font-sans text-[10px] tracking-[0.32em] text-[var(--sl-ink)] uppercase">
                Your Bag
              </span>
              {items.length > 0 && (
                <span className="font-sans text-[9.5px] tracking-[0.14em] text-[var(--sl-ink-soft)] uppercase">
                  {items.reduce((s, i) => s + i.quantity, 0)}{" "}
                  {items.reduce((s, i) => s + i.quantity, 0) === 1
                    ? "piece"
                    : "pieces"}
                </span>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
            <ShoppingBag className="h-7 w-7 text-[var(--sl-border-input)]" />
            <div>
              <p className="font-heading text-2xl leading-none tracking-[-0.01em] text-[var(--sl-ink)]">
                Your bag is empty.
              </p>
              <p className="mt-2 font-sans text-[13px] text-[var(--sl-ink-soft)]">
                Anything you add will appear here.
              </p>
            </div>
            <Link
              href="/shop"
              onClick={() => setIsOpen(false)}
              className="sl-btn mt-2 text-xs"
            >
              Browse the Collection →
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <>
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={`${item.productId}-${item.variantId ?? "base"}`}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="grid grid-cols-[80px_1fr_auto] items-center gap-3.5 border-b border-[var(--sl-border)] px-6 py-4"
                  >
                    <div className="sl-cart-thumb relative flex-shrink-0 overflow-hidden rounded-sm">
                      <Image
                        src={item.imageUrl ?? "/placeholder.svg"}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>

                    <div className="flex min-w-0 flex-col gap-1.5">
                      <p className="truncate font-sans text-[13px] leading-[1.2] font-medium text-[var(--sl-ink)]">
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p className="font-sans text-[10px] tracking-[0.1em] text-[var(--sl-ink-soft)] uppercase">
                          {item.variantName}
                        </p>
                      )}

                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex items-center border border-[var(--sl-border-input)]">
                          <button
                            className="flex size-6 items-center justify-center text-[var(--sl-ink)] transition-colors hover:bg-[var(--sl-cream)] disabled:opacity-30"
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.variantId,
                                item.quantity - 1,
                              )
                            }
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span className="w-6 text-center font-sans text-[12px]">
                            {item.quantity}
                          </span>
                          <button
                            className="flex size-6 items-center justify-center text-[var(--sl-ink)] transition-colors hover:bg-[var(--sl-cream)]"
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.variantId,
                                item.quantity + 1,
                              )
                            }
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                        <button
                          onClick={() =>
                            removeItem(item.productId, item.variantId)
                          }
                          className="ml-1 font-sans text-[10px] tracking-[0.1em] text-[var(--sl-coral)] uppercase underline transition-opacity hover:opacity-50"
                          aria-label={`Remove ${item.productName}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <span className="flex-shrink-0 font-sans text-[13px] font-medium text-[var(--sl-ink)]">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex flex-none flex-col gap-3 border-t border-[var(--sl-border)] px-6 py-5">
              {showFreeBar && untilFree !== null && progress !== null && (
                <div className="mb-1">
                  <div className="relative mb-1.5 h-px w-full bg-[var(--sl-border)]">
                    <div
                      className="absolute inset-y-0 left-0 h-px bg-[var(--sl-ink)] transition-all"
                      style={{
                        width: `${Math.min(100, Math.round(progress * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="font-sans text-[9.5px] tracking-[0.14em] text-[var(--sl-ink-soft)] uppercase">
                    {formatPrice(untilFree)} to free shipping
                  </p>
                </div>
              )}

              <div className="flex items-baseline justify-between">
                <span className="font-sans text-[10px] tracking-[0.18em] text-[var(--sl-ink-soft)] uppercase">
                  Subtotal
                </span>
                <span className="font-sans text-sm font-medium text-[var(--sl-ink)]">
                  {formatPrice(subtotal)} USD
                </span>
              </div>

              <Link
                href="/checkout"
                onClick={() => setIsOpen(false)}
                className="sl-btn flex w-full items-center justify-between"
              >
                <span>Checkout</span>
                <span>{formatPrice(subtotal)} →</span>
              </Link>

              <p className="text-center font-sans text-[11px] text-[var(--sl-ink-soft)]">
                Shipping &amp; taxes calculated at checkout.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

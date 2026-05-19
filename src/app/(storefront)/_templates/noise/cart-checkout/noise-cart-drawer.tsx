"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { ShippingConfig } from "~/lib/shipping-utils";
import { formatPrice } from "~/lib/prices";
import {
  getAmountUntilFreeShipping,
  SHIPPING_TYPES,
} from "~/lib/shipping-utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { useCart } from "~/providers/cart-context";

import { NoiseCartSummary } from "./noise-cart-summary";

type NoiseCartDrawerProps = {
  shippingConfig: ShippingConfig;
};

export function NoiseCartDrawer({ shippingConfig }: NoiseCartDrawerProps) {
  const { items, subtotal, isOpen, setIsOpen, updateQuantity, removeItem } = useCart();

  const untilFree = getAmountUntilFreeShipping(subtotal, shippingConfig);
  const hasFreeShipping =
    shippingConfig.shippingType === SHIPPING_TYPES.FLAT_RATE_WITH_THRESHOLD &&
    shippingConfig.freeShippingThreshold != null;

  const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        className="flex w-full flex-col rounded-none border-l p-0 sm:max-w-[28rem]"
        style={{
          borderColor: "var(--vn-ink)",
          background: "var(--vn-paper)",
          color: "var(--vn-ink)",
        }}
      >
        {/* Header — "THE BAG" left, free shipping + piece count right */}
        <SheetHeader
          className="border-b flex-none"
          style={{ borderColor: "var(--vn-ink)" }}
        >
          <SheetTitle asChild>
            <div
              className="flex items-start justify-between px-5 py-3.5"
              style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--vn-steel-mist)" }} />
                <span className="font-mono text-[10px] tracking-[0.28em] uppercase">
                  The Bag
                </span>
              </div>
              <div className="text-right">
                {hasFreeShipping && shippingConfig.freeShippingThreshold != null && (
                  <p
                    className="font-mono text-[9px] tracking-[0.18em] uppercase"
                    style={{ color: untilFree === 0 ? "#4ade80" : "var(--vn-steel-mist)" }}
                  >
                    {untilFree === 0
                      ? "Free shipping unlocked ✓"
                      : `Free shipping over ${formatPrice(shippingConfig.freeShippingThreshold)}`}
                  </p>
                )}
                {totalPieces > 0 && (
                  <p
                    className="font-mono text-[9px] tracking-[0.18em] uppercase mt-0.5"
                    style={{ color: "var(--vn-steel-mist)" }}
                  >
                    {totalPieces} {totalPieces === 1 ? "piece" : "pieces"}
                  </p>
                )}
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
            <div
              className="flex items-center justify-center border-2"
              style={{ width: "64px", height: "64px", borderColor: "var(--vn-rule)" }}
            >
              <ShoppingBag className="h-6 w-6" style={{ color: "var(--vn-steel-mist)" }} />
            </div>
            <div>
              <p
                className="font-serif italic leading-none"
                style={{ fontSize: "24px", letterSpacing: "-0.01em" }}
              >
                The bag is empty.
              </p>
              <p className="mt-2 font-sans text-xs" style={{ color: "var(--vn-steel-mist)" }}>
                Add pieces from the collection
              </p>
            </div>
            <Link
              href="/shop"
              onClick={() => setIsOpen(false)}
              className="vn-stamp vn-stamp-solid text-[10px]"
            >
              Browse the Collection →
            </Link>
          </div>
        ) : (
          <>
            {/* Items list */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={`${item.productId}-${item.variantId ?? "base"}`}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex gap-4 border-b px-5 py-5"
                    style={{ borderColor: "var(--vn-rule)" }}
                  >
                    {/* Square thumbnail */}
                    <div
                      className="relative flex-shrink-0 overflow-hidden border"
                      style={{
                        width: "72px",
                        height: "72px",
                        background: "var(--vn-steel)",
                        borderColor: "var(--vn-ink)",
                      }}
                    >
                      <Image
                        src={item.imageUrl ?? "/placeholder.svg"}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="72px"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex flex-1 flex-col gap-2 min-w-0">
                      {/* Name + × */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className="font-serif italic leading-[1.1] truncate"
                            style={{ fontSize: "17px", letterSpacing: "-0.005em" }}
                          >
                            {item.productName}
                          </p>
                          {item.variantName && (
                            <p
                              className="font-mono text-[9px] tracking-[0.14em] uppercase mt-0.5"
                              style={{ color: "var(--vn-steel)" }}
                            >
                              {item.variantName}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.productId, item.variantId)}
                          className="flex-shrink-0 font-mono text-lg leading-none transition-opacity hover:opacity-40 mt-0.5"
                          style={{ color: "var(--vn-steel-mist)" }}
                          aria-label={`Remove ${item.productName}`}
                        >
                          ×
                        </button>
                      </div>

                      {/* Price + qty row */}
                      <div className="flex items-center justify-between gap-3">
                        <p
                          className="font-mono tracking-[0.06em]"
                          style={{ fontSize: "12px", color: "var(--vn-steel-mist)" }}
                        >
                          {formatPrice(item.price)}
                        </p>

                        {/* Qty stepper */}
                        <div
                          className="flex items-center border"
                          style={{ borderColor: "var(--vn-ink)" }}
                        >
                          <button
                            className="flex items-center justify-center font-mono transition-colors hover:bg-foreground hover:text-background disabled:opacity-30"
                            style={{ width: "30px", height: "30px" }}
                            onClick={() =>
                              updateQuantity(item.productId, item.variantId, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span
                            className="font-mono text-sm text-center"
                            style={{ width: "28px" }}
                          >
                            {item.quantity}
                          </span>
                          <button
                            className="flex items-center justify-center font-mono transition-colors hover:bg-foreground hover:text-background"
                            style={{ width: "30px", height: "30px" }}
                            onClick={() =>
                              updateQuantity(item.productId, item.variantId, item.quantity + 1)
                            }
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>

                        {/* Line total */}
                        <span
                          className="font-mono tracking-[0.06em] text-right"
                          style={{ fontSize: "12px" }}
                        >
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Summary — flush, no extra wrapper padding */}
            <div className="flex-none border-t" style={{ borderColor: "var(--vn-ink)" }}>
              <NoiseCartSummary shippingConfig={shippingConfig} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

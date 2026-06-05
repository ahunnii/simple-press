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
      <SheetContent
        className="flex w-full flex-col rounded-none p-0 sm:max-w-[26rem]"
        style={{
          borderLeft: "1px solid var(--vn-rule)",
          background: "var(--vn-paper)",
          color: "var(--vn-ink)",
        }}
      >
        {/* ── Header — "Your Bag" + close (× provided by SheetContent) ── */}
        <SheetHeader
          className="flex-none border-b"
          style={{ borderColor: "var(--vn-rule)" }}
        >
          <SheetTitle asChild>
            <div
              className="flex items-center justify-between px-6 py-5"
              style={{ background: "var(--vn-paper)" }}
            >
              <span
                className="font-mono text-[10px] tracking-[0.32em] uppercase"
                style={{ color: "var(--vn-ink)" }}
              >
                Your Bag
              </span>
              {items.length > 0 && (
                <span
                  className="font-mono text-[9.5px] tracking-[0.14em] uppercase"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  {items.reduce((s, i) => s + i.quantity, 0)}{" "}
                  {items.reduce((s, i) => s + i.quantity, 0) === 1
                    ? "piece"
                    : "pieces"}
                </span>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* ── Empty state ── */}
        {items.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
            <ShoppingBag
              className="h-7 w-7"
              style={{ color: "var(--vn-rule)" }}
            />
            <div>
              <p
                className="font-serif italic leading-none"
                style={{ fontSize: "24px", letterSpacing: "-0.01em" }}
              >
                Your bag is empty.
              </p>
              <p
                className="mt-2 font-sans text-[13px]"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Anything you add will appear here.
              </p>
            </div>
            <Link
              href="/shop"
              onClick={() => setIsOpen(false)}
              className="font-mono text-[10px] tracking-[0.22em] uppercase transition-opacity hover:opacity-70 mt-2"
              style={{
                borderBottom: "1px solid var(--vn-ink)",
                paddingBottom: "4px",
                color: "var(--vn-ink)",
              }}
            >
              Browse the Collection →
            </Link>
          </div>
        )}

        {/* ── Items list ── */}
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
                    className="grid items-center gap-3.5 border-b px-6 py-4"
                    style={{
                      gridTemplateColumns: "80px 1fr auto",
                      borderColor: "var(--vn-line-soft)",
                    }}
                  >
                    {/* Thumbnail — 4:5 matching design's 80×100 */}
                    <div
                      className="relative flex-shrink-0 overflow-hidden"
                      style={{
                        width: "80px",
                        height: "100px",
                        background: "var(--vn-steel)",
                        borderRadius: "2px",
                      }}
                    >
                      <Image
                        src={item.imageUrl ?? "/placeholder.svg"}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <p
                        className="font-sans leading-[1.2] truncate"
                        style={{ fontSize: "13px", fontWeight: 500 }}
                      >
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p
                          className="font-mono text-[10px] tracking-[0.1em] uppercase"
                          style={{ color: "var(--vn-steel-mist)" }}
                        >
                          {item.variantName}
                        </p>
                      )}

                      {/* Qty stepper + Remove */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div
                          className="flex items-center border"
                          style={{ borderColor: "var(--vn-rule)" }}
                        >
                          <button
                            className="flex items-center justify-center transition-colors hover:bg-foreground hover:text-background disabled:opacity-30"
                            style={{ width: "24px", height: "24px" }}
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
                          <span
                            className="font-mono text-[12px] text-center"
                            style={{ width: "24px" }}
                          >
                            {item.quantity}
                          </span>
                          <button
                            className="flex items-center justify-center transition-colors hover:bg-foreground hover:text-background"
                            style={{ width: "24px", height: "24px" }}
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
                          className="font-mono text-[10px] tracking-[0.1em] uppercase transition-opacity hover:opacity-50 ml-1"
                          style={{ color: "var(--vn-steel-mist)", textDecoration: "underline" }}
                          aria-label={`Remove ${item.productName}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Line total */}
                    <span
                      className="font-sans flex-shrink-0"
                      style={{ fontSize: "13px", fontWeight: 500 }}
                    >
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* ── Footer — subtotal + checkout + note ── */}
            <div
              className="flex-none border-t px-6 py-5 flex flex-col gap-3"
              style={{ borderColor: "var(--vn-rule)" }}
            >
              {/* Free shipping bar */}
              {showFreeBar && untilFree !== null && progress !== null && (
                <div className="mb-1">
                  <div
                    className="h-px w-full relative mb-1.5"
                    style={{ background: "var(--vn-rule)" }}
                  >
                    <div
                      className="absolute inset-y-0 left-0 transition-all"
                      style={{
                        width: `${Math.min(100, Math.round(progress * 100))}%`,
                        background: "var(--vn-ink)",
                        height: "1px",
                      }}
                    />
                  </div>
                  <p
                    className="font-mono text-[9.5px] tracking-[0.14em] uppercase"
                    style={{ color: "var(--vn-steel-mist)" }}
                  >
                    {formatPrice(untilFree)} to free shipping
                  </p>
                </div>
              )}

              {/* Subtotal row */}
              <div className="flex justify-between items-baseline">
                <span
                  className="font-mono text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: "var(--vn-ink-soft)" }}
                >
                  Subtotal
                </span>
                <span
                  className="font-sans"
                  style={{ fontSize: "14px", fontWeight: 500 }}
                >
                  {formatPrice(subtotal)} USD
                </span>
              </div>

              {/* Checkout button */}
              <Link
                href="/checkout"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between w-full px-5 py-4 font-mono text-[11px] tracking-[0.28em] uppercase transition-opacity hover:opacity-80"
                style={{ background: "var(--vn-ink)", color: "#fff" }}
              >
                <span>Checkout</span>
                <span>{formatPrice(subtotal)} →</span>
              </Link>

              {/* Tax note */}
              <p
                className="font-sans text-[11px] text-center"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Shipping &amp; taxes calculated at checkout.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

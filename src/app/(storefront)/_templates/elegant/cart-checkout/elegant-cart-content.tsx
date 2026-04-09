"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, X } from "lucide-react";

import { formatPrice } from "~/lib/prices";
import { useCart } from "~/providers/cart-context";

export function ElegantCartContent() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mt-6 font-serif text-2xl font-light tracking-wide text-foreground">
          Your cart is empty
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Looks like you haven&apos;t added anything yet.
        </p>
        <Link
          href="/shop"
          className="boty-transition boty-shadow mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Continue Shopping <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
      {/* Cart Items */}
      <div className="lg:col-span-2">
        <div className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.variantId}`}
              className="flex gap-6 py-8 first:pt-0"
            >
              <Link
                href={`/shop/${item.productId}`}
                className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-muted"
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    No image
                  </div>
                )}
              </Link>

              <div className="flex flex-1 flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/shop/${item.productId}`}
                      className="font-serif text-sm font-medium text-foreground hover:text-muted-foreground"
                    >
                      {item.productName}
                    </Link>
                    {item.variantName && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.variantName}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`Remove ${item.productName}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center overflow-hidden rounded-full border border-border">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.variantId,
                          item.quantity - 1,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center text-foreground hover:bg-muted boty-transition"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="flex h-8 w-10 items-center justify-center border-x border-border text-xs font-medium text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.variantId,
                          item.quantity + 1,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center text-foreground hover:bg-muted boty-transition"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="font-serif text-sm font-medium text-foreground">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/shop"
          className="boty-transition mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Continue Shopping
        </Link>
      </div>

      {/* Order Summary */}
      <div>
        <div className="boty-shadow sticky top-24 rounded-3xl bg-card p-8">
          <h2 className="font-serif text-xl font-light tracking-wide text-foreground">
            Order Summary
          </h2>

          <div className="mt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-muted-foreground">Calculated at checkout</span>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <div className="flex justify-between">
              <span className="font-serif font-medium text-foreground">
                Estimated total
              </span>
              <span className="font-serif text-lg font-medium text-foreground">
                {formatPrice(subtotal)}
              </span>
            </div>
          </div>

          <Link
            href="/checkout"
            className="boty-transition boty-shadow mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Proceed to Checkout <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Tax and shipping calculated at checkout.
          </p>
        </div>
      </div>
    </div>
  );
}

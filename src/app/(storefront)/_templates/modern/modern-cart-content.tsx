"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, X } from "lucide-react";

import { useCart } from "~/providers/cart-context";

export function ModernCartContent() {
  const { items, updateQuantity, removeItem } = useCart();
  const totalPrice = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <ShoppingBag className="text-muted-foreground/40 mx-auto h-12 w-12" />
        <h2 className="text-foreground mt-4 font-serif text-2xl">
          Your cart is empty
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Looks like you have not added any items yet.
        </p>
        <Link
          href="/products"
          className="bg-primary text-primary-foreground mt-8 inline-flex items-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
        >
          Start Shopping
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
      {/* Cart Items */}
      <div className="lg:col-span-2">
        <div className="flex flex-col">
          {items.map((item) => (
            <div
              key={item.productId}
              className="border-border flex gap-6 border-b py-8 first:pt-0 last:border-b-0"
            >
              <Link
                href={`/products/${item.productId}`}
                className="bg-muted relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-sm"
              >
                <Image
                  src={item.imageUrl ?? "/placeholder.svg"}
                  alt={item.productName}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </Link>

              <div className="flex flex-1 flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/products/${item.productId}`}
                      className="text-foreground hover:text-muted-foreground text-sm font-medium transition-colors"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {item.variantName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`Remove ${item.productName} from cart`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="border-border flex items-center border">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.variantId,
                          item.quantity - 1,
                        )
                      }
                      className="text-foreground hover:bg-muted flex h-8 w-8 items-center justify-center transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="border-border text-foreground flex h-8 w-10 items-center justify-center border-x text-xs font-medium">
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
                      className="text-foreground hover:bg-muted flex h-8 w-8 items-center justify-center transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-foreground text-sm font-medium">
                    ${item.price * item.quantity}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div>
        <div className="border-border bg-card rounded-sm border p-8">
          <h2 className="text-foreground text-xs font-semibold tracking-widest uppercase">
            Order Summary
          </h2>

          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">${totalPrice}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-foreground">
                {totalPrice >= 150 ? "Free" : "$12"}
              </span>
            </div>
          </div>

          <div className="border-border mt-6 border-t pt-6">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">Total</span>
              <span className="text-foreground text-lg font-medium">
                ${totalPrice >= 150 ? totalPrice : totalPrice + 12}
              </span>
            </div>
          </div>

          <Link
            href="/checkout"
            className="bg-primary text-primary-foreground mt-8 flex w-full items-center justify-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
          >
            Proceed to Checkout
            <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="text-muted-foreground mt-4 text-center text-xs">
            Free shipping on orders over $150
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";

import { formatPrice } from "~/lib/prices";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { useCart } from "~/providers/cart-context";

export function CartSummary() {
  const { subtotal, itemCount, total } = useCart();
  const shipping = subtotal >= 35 ? 0 : 599;

  return (
    <div className="border-border bg-card rounded-xl border p-6">
      <h2 className="text-card-foreground font-heading text-lg font-semibold">
        Order Summary
      </h2>
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
          <span className="text-foreground font-medium">
            {formatPrice(subtotal)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span className="text-foreground font-medium">
            {shipping === 0 ? "Free" : formatPrice(shipping)}
          </span>
        </div>
        {shipping > 0 && (
          <p className="text-muted-foreground text-xs">
            Free shipping on orders over $35
          </p>
        )}
        <Separator />
        <div className="flex justify-between">
          <span className="text-foreground font-semibold">Total</span>
          <span className="text-foreground text-lg font-bold">
            {formatPrice(total)}
          </span>
        </div>
      </div>
      <Button className="mt-6 w-full" size="lg" asChild>
        <Link href="/checkout">Proceed to Checkout</Link>
      </Button>
    </div>
  );
}

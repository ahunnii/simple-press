"use client";

import Image from "next/image";

import { formatPrice } from "~/lib/prices";
import { Separator } from "~/components/ui/separator";
import { useCart } from "~/providers/cart-context";

export function OrderSummary() {
  const { items, subtotal } = useCart();
  const shipping = subtotal >= 35 ? 0 : 5.99;
  const tax = subtotal * 0.06;
  const total = subtotal + shipping + tax;

  return (
    <div className="border-border bg-card rounded-xl border p-6">
      <h2 className="text-card-foreground font-heading text-lg font-semibold">
        Order Summary
      </h2>
      <div className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center gap-3">
            <div className="bg-secondary relative size-12 shrink-0 overflow-hidden rounded-md">
              <Image
                src={item.imageUrl ?? "/placeholder.svg"}
                alt={item.productName}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <div className="flex-1">
              <p className="text-card-foreground text-sm font-medium">
                {item.productName}
              </p>
              <p className="text-muted-foreground text-xs">
                Qty: {item.quantity}
              </p>
            </div>
            <span className="text-foreground text-sm font-medium">
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
        <Separator className="my-1" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-foreground">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span className="text-foreground">
            {shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Estimated Tax</span>
          <span className="text-foreground">${tax.toFixed(2)}</span>
        </div>
        <Separator className="my-1" />
        <div className="flex justify-between">
          <span className="text-foreground font-semibold">Total</span>
          <span className="text-foreground text-lg font-bold">
            ${total.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

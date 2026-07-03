"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";

import { shippingConfigFromBusiness } from "~/lib/shipping-utils";
import { useCart } from "~/providers/cart-context";

import { ModernCartItem } from "./modern-cart-item";
import { ModernCartSummary } from "./modern-cart-summary";

type Props = {
  business: {
    id: string;
    shippingType: string;
    shippingFlatRate: number | null;
    freeShippingThreshold: number | null;
    offersInStorePickup: boolean;
  };
};

export function ModernCartContents({ business }: Props) {
  const { items, isHydrated } = useCart();

  const shippingConfig = shippingConfigFromBusiness(business);

  // Avoid an empty→filled flash while the cart loads from localStorage
  if (!isHydrated) {
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <ShoppingBag
          aria-hidden="true"
          className="text-muted-foreground/40 mx-auto h-12 w-12"
        />
        <h2 className="text-foreground mt-4 font-serif text-2xl">
          Your cart is empty
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Looks like you have not added any items yet.
        </p>
        <Link
          href="/shop"
          className="bg-primary text-primary-foreground mt-8 inline-flex items-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
        >
          Start Shopping
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
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
            <ModernCartItem
              key={`${item.productId}-${item.variantId ?? "base"}`}
              item={item}
            />
          ))}
        </div>
      </div>

      {/* Order Summary */}

      <ModernCartSummary shippingConfig={shippingConfig} />
    </div>
  );
}

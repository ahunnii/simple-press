"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useCart } from "~/providers/cart-context";

type Business = {
  id: string;
  siteContent: {
    primaryColor: string | null;
  } | null;
};

type CartContentsProps = {
  business: Business;
};

export function DefaultCartContents({ business }: CartContentsProps) {
  const router = useRouter();
  const {
    items,
    incrementItem,
    decrementItem,
    removeItem,
    updateQuantity,
    total,
    clearCart,
  } = useCart();

  const primaryColor = business.siteContent?.primaryColor ?? "#3b82f6";

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const handleCheckout = () => {
    router.push("/checkout");
  };

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-gray-400" />
        <h2 className="mb-2 text-2xl font-semibold text-gray-900">
          Your cart is empty
        </h2>
        <p className="mb-8 text-gray-600">Add some products to get started!</p>
        <Button asChild style={{ backgroundColor: primaryColor }}>
          <Link href="/products">Shop Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Cart Items */}
      <div className="space-y-4 lg:col-span-2">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId}`}
            className="flex gap-4 rounded-lg border bg-white p-4"
          >
            {/* Image */}
            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded bg-gray-100">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.productName}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  No image
                </div>
              )}
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-gray-900">
                {item.productName}
              </h3>
              {item.variantName && (
                <p className="text-sm text-gray-600">{item.variantName}</p>
              )}
              {item.sku && (
                <p className="text-xs text-gray-500">SKU: {item.sku}</p>
              )}
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {formatPrice(item.price)}
              </p>
            </div>

            {/* Quantity Controls */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => decrementItem(item.productId, item.variantId)}
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <Input
                  type="number"
                  min="1"
                  max={item.maxInventory ?? 999}
                  value={item.quantity}
                  onChange={(e) => {
                    const qty = parseInt(e.target.value);
                    if (!isNaN(qty)) {
                      updateQuantity(item.productId, item.variantId, qty);
                    }
                  }}
                  className="w-16 text-center"
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => incrementItem(item.productId, item.variantId)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem(item.productId, item.variantId)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Remove
              </Button>

              <p className="text-sm font-semibold text-gray-900">
                {formatPrice(item.price * item.quantity)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 rounded-lg border p-6">
          <h2 className="mb-4 text-xl font-semibold">Order Summary</h2>

          <div className="mb-6 space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="flex justify-between border-t pt-3 text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <Button
            onClick={handleCheckout}
            className="mb-3 w-full text-white"
            size="lg"
            style={{ backgroundColor: primaryColor }}
          >
            Proceed to Checkout
          </Button>

          <Button
            onClick={() => clearCart()}
            variant="outline"
            className="w-full"
          >
            Clear Cart
          </Button>
        </div>
      </div>
    </div>
  );
}

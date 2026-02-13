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

export function DarkTrendCartContents({
  business: _business,
}: CartContentsProps) {
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
        <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-white/40" />
        <h2 className="mb-2 text-2xl font-semibold text-white">
          Your cart is empty
        </h2>
        <p className="mb-8 text-white/70">Add some products to get started!</p>
        <Button
          asChild
          className="bg-violet-500 text-white hover:bg-violet-600"
        >
          <Link href="/shop">Shop Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Cart Items */}
      <div className="space-y-6 lg:col-span-2">
        {/* Table Header - Desktop Only */}
        <div className="hidden grid-cols-[2fr_1fr_1fr] gap-4 border-b border-white/20 pb-4 lg:grid">
          <div className="text-sm font-semibold tracking-wider text-white uppercase">
            Product
          </div>
          <div className="text-sm font-semibold tracking-wider text-white uppercase">
            Quantity
          </div>
          <div className="text-sm font-semibold tracking-wider text-white uppercase">
            Subtotal
          </div>
        </div>

        {/* Cart Items */}
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId}`}
            className="grid grid-cols-1 gap-4 border-b border-white/10 pb-6 lg:grid-cols-[2fr_1fr_1fr] lg:items-center"
          >
            {/* Product Info */}
            <div className="flex gap-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-sm bg-zinc-900">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/40">
                    No image
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white">{item.productName}</h3>
                {item.variantName && (
                  <p className="text-sm text-white/70">
                    <span className="text-white/50">Size:</span>{" "}
                    {item.variantName}
                  </p>
                )}
                {item.sku && (
                  <p className="text-sm text-white/70">
                    <span className="text-white/50">SKU:</span> {item.sku}
                  </p>
                )}
                <p className="mt-2 text-lg font-semibold text-white">
                  {formatPrice(item.price)}
                </p>

                {/* Remove button - mobile */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.productId, item.variantId)}
                  className="mt-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 lg:hidden"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Remove
                </Button>
              </div>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center gap-2">
              <span className="mr-2 text-sm text-white/70 lg:hidden">
                Quantity:
              </span>
              <div className="inline-flex items-center gap-2 rounded-md bg-zinc-900/50 px-2 py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => decrementItem(item.productId, item.variantId)}
                  className="h-8 w-8 rounded-sm bg-zinc-800 p-0 text-white/60 hover:bg-zinc-700 hover:text-white"
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
                  className="h-8 w-14 border-none bg-transparent text-center text-white"
                />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => incrementItem(item.productId, item.variantId)}
                  className="h-8 w-8 rounded-sm bg-zinc-800 p-0 text-white/60 hover:bg-zinc-700 hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Remove button - desktop */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem(item.productId, item.variantId)}
                className="ml-2 hidden text-red-400 hover:bg-red-500/10 hover:text-red-300 lg:inline-flex"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Subtotal */}
            <div className="flex items-center justify-between lg:justify-start">
              <span className="text-sm text-white/70 lg:hidden">Subtotal:</span>
              <p className="text-lg font-semibold text-white">
                {formatPrice(item.price * item.quantity)}
              </p>
            </div>
          </div>
        ))}

        {/* Cart Actions */}
        {/* <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:justify-between">
          <div className="flex gap-4">
            <Input
              placeholder="Coupon code"
              className="border-white/20 bg-zinc-900/50 text-white placeholder:text-white/40"
            />
            <Button className="bg-violet-500 font-medium text-white hover:bg-violet-600">
              Apply coupon
            </Button>
          </div>
          <Button
            onClick={() => clearCart()}
            className="border border-white/60 bg-transparent font-medium text-white hover:bg-white/10"
          >
            Clear Cart
          </Button>
        </div> */}
      </div>

      {/* Cart Totals */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 space-y-6 rounded-sm bg-zinc-900/30 p-6">
          <h2 className="text-xl font-semibold text-white">Cart totals</h2>

          <div className="space-y-4">
            <div className="flex justify-between border-b border-white/10 pb-4 text-white/80">
              <span>Subtotal</span>
              <span className="font-semibold text-white">
                {formatPrice(total)}
              </span>
            </div>

            {/* <div className="border-b border-white/10 pb-4"> */}

            {/* <p className="text-sm text-white/60">Free shipping</p>
              <p className="text-sm text-white/60">
                <span className="font-medium">Shipping to</span> MI.
              </p>
              <button className="mt-2 text-sm text-white/60 underline hover:text-white">
                Change address
              </button> */}
            {/* </div> */}

            <div className="flex justify-between text-white/80">
              <span>Shipping</span>
              <span className="font-semibold text-white">
                Calculated at checkout
              </span>
            </div>

            {/* <div className="flex justify-between text-white/80">
              <span>Tax</span>
              <span className="font-semibold text-white">$0.00</span>
            </div> */}

            <div className="flex justify-between border-t border-white/20 pt-4 text-lg font-bold text-white">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <Button
            onClick={handleCheckout}
            className="w-full bg-violet-500 py-6 text-base font-semibold text-white hover:bg-violet-600"
            size="lg"
          >
            Proceed to checkout
          </Button>
        </div>
      </div>
    </div>
  );
}

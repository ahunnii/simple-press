"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, X } from "lucide-react";

import { useCart } from "~/providers/cart-context";

type Business = {
  id: string;
  siteContent: { primaryColor: string | null } | null;
};

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );

export function DefaultCartContents({ business: _ }: { business: Business }) {
  const router = useRouter();
  const { items, incrementItem, decrementItem, removeItem, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="py-24 text-center">
        <ShoppingBag className="mx-auto mb-5 h-12 w-12 text-[#a3a3a3]" />
        <h2 className="font-serif text-2xl font-medium">Your cart is empty</h2>
        <p className="mt-2 text-sm text-[#6b6b6b]">
          Add some products to get started.
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-[var(--radius)] bg-[#0a0a0a] px-8 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a]"
        >
          Shop products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_340px]">

      {/* Line items */}
      <div className="flex flex-col divide-y divide-[#e8e8e8]">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId}`}
            className="flex gap-5 py-6 first:pt-0"
          >
            {/* Image */}
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius)] bg-[#f6f6f6]">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.productName}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-[#a3a3a3]" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-serif text-[15px] font-medium leading-snug">
                    {item.productName}
                  </h3>
                  {item.variantName && (
                    <p className="text-[13px] text-[#6b6b6b]">
                      {item.variantName}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId, item.variantId)}
                  aria-label="Remove item"
                  className="shrink-0 text-[#a3a3a3] transition-colors hover:text-[#0a0a0a]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 mt-auto">
                {/* Qty stepper */}
                <div className="inline-flex h-9 w-[108px] items-center rounded-[var(--radius)] border border-[#e8e8e8]">
                  <button
                    type="button"
                    onClick={() => decrementItem(item.productId, item.variantId)}
                    disabled={item.quantity <= 1}
                    aria-label="Decrease"
                    className="flex h-full flex-1 items-center justify-center text-base font-light transition-colors hover:bg-[#f6f6f6] disabled:opacity-30 rounded-l-[var(--radius)]"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => incrementItem(item.productId, item.variantId)}
                    disabled={
                      item.maxInventory !== undefined &&
                      item.quantity >= item.maxInventory
                    }
                    aria-label="Increase"
                    className="flex h-full flex-1 items-center justify-center text-base font-light transition-colors hover:bg-[#f6f6f6] rounded-r-[var(--radius)]"
                  >
                    +
                  </button>
                </div>

                <p className="text-sm font-medium">
                  {fmt(item.price * item.quantity)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order summary */}
      <div>
        <div className="sticky top-[calc(72px+24px)] rounded-[var(--radius)] border border-[#e8e8e8] p-6">
          <h2 className="font-serif text-xl font-medium mb-5">Order summary</h2>

          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6b6b6b]">Subtotal</span>
              <span className="font-medium">{fmt(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b6b6b]">Shipping</span>
              <span className="text-[#6b6b6b]">Calculated at checkout</span>
            </div>
          </div>

          <div className="my-5 border-t border-[#e8e8e8]" />

          <div className="flex justify-between text-base font-medium mb-6">
            <span>Estimated total</span>
            <span>{fmt(total)}</span>
          </div>

          <button
            type="button"
            onClick={() => router.push("/checkout")}
            className="w-full h-12 rounded-[var(--radius)] bg-[#0a0a0a] text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a]"
          >
            Continue to checkout
          </button>

          <Link
            href="/shop"
            className="mt-4 block text-center text-sm text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { useCart } from "~/providers/cart-context";

export function ModernProductActions({
  product,
}: {
  product: NonNullable<RouterOutputs["product"]["get"]>;
}) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem, getItemQuantity } = useCart();
  const router = useRouter();

  const trackInventory = product.trackInventory ?? false;
  const allowBackorders = product.allowBackorders ?? false;
  const inventoryQty = product.inventoryQty ?? 0;
  const cartQty = getItemQuantity(product.id, null);
  const remainingStock = trackInventory && !allowBackorders
    ? Math.max(0, inventoryQty - cartQty)
    : 999;
  const maxQuantity = trackInventory && !allowBackorders ? remainingStock : 999;
  const outOfStock =
    trackInventory && !allowBackorders && inventoryQty <= 0;
  const canAddMore = !outOfStock && quantity <= maxQuantity;

  const cappedQuantity = Math.min(quantity, Math.max(1, maxQuantity));

  function handleAddToCart() {
    if (!canAddMore) return;
    addItem(
      {
        productId: product.id,
        variantId: null,
        productName: product.name,
        variantName: null,
        price: product.price,
        imageUrl: product.images[0]?.url ?? null,
        sku: null,
        ...(trackInventory && !allowBackorders && { maxInventory: inventoryQty }),
      },
      cappedQuantity,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    if (!canAddMore) return;
    addItem(
      {
        productId: product.id,
        variantId: null,
        productName: product.name,
        variantName: null,
        price: product.price,
        imageUrl: product.images[0]?.url ?? null,
        sku: null,
        ...(trackInventory && !allowBackorders && { maxInventory: inventoryQty }),
      },
      cappedQuantity,
    );
    router.push("/checkout");
  }

  return (
    <div className="mt-8">
      {trackInventory && (
        <p className="text-muted-foreground mb-2 text-sm">
          {allowBackorders
            ? "Backorders allowed"
            : `${inventoryQty} in stock${cartQty > 0 ? ` (${cartQty} in cart)` : ""}`}
        </p>
      )}
      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <span className="text-foreground text-xs font-semibold tracking-widest uppercase">
          Quantity
        </span>
        <div className="border-border flex items-center border">
          <button
            type="button"
            onClick={() =>
              setQuantity((q) => Math.max(1, Math.min(maxQuantity, q - 1)))
            }
            disabled={outOfStock || quantity <= 1}
            className="text-foreground hover:bg-muted flex h-10 w-10 items-center justify-center transition-colors disabled:opacity-50"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="border-border text-foreground flex h-10 w-12 items-center justify-center border-x text-sm font-medium">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() =>
              setQuantity((q) => Math.min(maxQuantity, q + 1))
            }
            disabled={outOfStock || quantity >= maxQuantity}
            className="text-foreground hover:bg-muted flex h-10 w-10 items-center justify-center transition-colors disabled:opacity-50"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={outOfStock || !canAddMore}
          className="bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {added ? (
            <>
              <Check className="h-4 w-4" />
              Added to Cart
            </>
          ) : outOfStock ? (
            "Out of Stock"
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" />
              Add to Cart
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={outOfStock || !canAddMore}
          className="border-foreground text-foreground hover:bg-foreground hover:text-background flex flex-1 items-center justify-center gap-2 border px-8 py-3 text-sm font-medium tracking-wide transition-colors disabled:opacity-50"
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}

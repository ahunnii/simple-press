"use client";

import { Check, ShoppingCart } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";

type AddToCartButtonProps = {
  product: {
    id: string;
    name: string;
    price: number;
    images: Array<{ url: string }>;
  };
  variant?: {
    id: string;
    name: string;
    price: number | null;
    inventoryQty: number;
    sku: string | null;
  } | null;
};

export function AddToCartButton({ product, variant }: AddToCartButtonProps) {
  const { addItem, isInCart, isHydrated } = useCart();

  const productId = product.id;
  const variantId = variant?.id ?? null;
  const price = variant?.price ?? product.price;
  const imageUrl = product.images[0]?.url ?? null;
  const maxInventory = variant?.inventoryQty;

  const inCart = isInCart(productId, variantId);

  const handleAddToCart = () => {
    addItem({
      productId,
      variantId,
      productName: product.name,
      variantName: variant?.name ?? null,
      price,
      imageUrl,
      sku: variant?.sku ?? null,
      maxInventory, // ← Validates against stock
    });
  };

  // Don't render until hydrated (prevents flash)
  if (!isHydrated) {
    return (
      <Button disabled className="w-full">
        Loading...
      </Button>
    );
  }

  return (
    <Button
      onClick={handleAddToCart}
      className="w-full"
      variant={inCart ? "outline" : "default"}
    >
      {inCart ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          In Cart - Add More
        </>
      ) : (
        <>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </>
      )}
    </Button>
  );
}

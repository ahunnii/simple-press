"use client";

import { Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";

type QuickAddProduct = {
  id: string;
  name: string;
  price: number;
  images: Array<{ url: string }>;
  trackInventory?: boolean;
  allowBackorders?: boolean;
  inventoryQty: number;
};

export function QuickAddButton({ product }: { product: QuickAddProduct }) {
  const { addItem, getItemQuantity } = useCart();

  const quantity = getItemQuantity(product.id, null);
  const trackInventory = product.trackInventory ?? false;
  const allowBackorders = product.allowBackorders ?? false;
  const outOfStock =
    trackInventory && !allowBackorders && (product.inventoryQty ?? 0) <= 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if inside Link
    e.stopPropagation();
    if (outOfStock) return;

    addItem({
      productId: product.id,
      variantId: null,
      productName: product.name,
      variantName: null,
      price: product.price,
      imageUrl: product.images[0]?.url ?? null,
      sku: null,
      ...(trackInventory &&
        !allowBackorders && { maxInventory: product.inventoryQty ?? 0 }),
    });
  };

  return (
    <Button
      size="sm"
      onClick={handleQuickAdd}
      disabled={outOfStock}
      className="absolute right-2 bottom-2"
    >
      <Plus className="h-4 w-4" />
      {quantity > 0 && <span className="ml-1">({quantity})</span>}
    </Button>
  );
}

"use client";

import { Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";

type QuickAddProduct = {
  id: string;
  name: string;
  price: number;
  images: Array<{ url: string }>;
  inventoryQty: number;
};

export function QuickAddButton({ product }: { product: QuickAddProduct }) {
  const { addItem, getItemQuantity } = useCart();

  const quantity = getItemQuantity(product.id, null);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if inside Link
    e.stopPropagation();

    addItem({
      productId: product.id,
      variantId: null,
      productName: product.name,
      variantName: null,
      price: product.price,
      imageUrl: product.images[0]?.url ?? null,
      sku: null,
      maxInventory: product.inventoryQty,
    });
  };

  return (
    <Button
      size="sm"
      onClick={handleQuickAdd}
      className="absolute right-2 bottom-2"
    >
      <Plus className="h-4 w-4" />
      {quantity > 0 && <span className="ml-1">({quantity})</span>}
    </Button>
  );
}

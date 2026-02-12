import { useState } from "react";

import type { RouterOutputs } from "~/trpc/react";
import { useCart } from "~/providers/cart-context";

const UNLIMITED_STOCK = 999;

export function useProduct(
  product: NonNullable<RouterOutputs["product"]["get"]>,
) {
  const { addItem, getItemQuantity, isHydrated } = useCart();

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants[0]?.id ?? null,
  );

  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // Get selected variant
  const selectedVariant = product.variants.find(
    (v) => v.id === selectedVariantId,
  );

  // Calculate price (treat variant price 0 or null as "use product base price")
  const displayPrice =
    selectedVariant?.price != null && selectedVariant.price !== 0
      ? selectedVariant.price
      : product.price;

  // Get current cart quantity for this variant
  const cartQuantity = getItemQuantity(product.id, selectedVariantId);

  // Calculate remaining stock and max inventory
  const hasVariants = product.variants.length > 0;
  const maxInventory = hasVariants
    ? (selectedVariant?.inventoryQty ?? 0)
    : product.trackInventory && !product.allowBackorders
      ? (product.inventoryQty ?? 0)
      : UNLIMITED_STOCK;
  const remainingStock = maxInventory - cartQuantity;
  const canAddMore = remainingStock > 0;

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  // Extract unique option types from variants
  const getVariantOptions = () => {
    if (product.variants.length === 0) return {};

    const optionTypes: Record<string, Set<string>> = {};

    product.variants.forEach((variant) => {
      Object.entries(variant.options as Record<string, string>).forEach(
        ([key, value]) => {
          if (!optionTypes[key]!) {
            optionTypes[key] = new Set();
          }
          optionTypes[key]?.add(value);
        },
      );
    });

    return Object.fromEntries(
      Object.entries(optionTypes).map(([key, values]) => [
        key,
        Array.from(values),
      ]),
    );
  };

  const variantOptions = getVariantOptions();

  // Get selected options from current variant
  const getSelectedOptions = () => {
    if (!selectedVariant) return {};
    return selectedVariant.options;
  };

  const selectedOptions = getSelectedOptions() as Record<string, string>;

  // Handle option selection
  const handleOptionSelect = (optionType: string, value: string) => {
    const newOptions = { ...selectedOptions, [optionType]: value } as Record<
      string,
      string
    >;

    // Find variant matching these options
    const matchingVariant = product.variants.find((variant) => {
      return Object.entries(newOptions).every(
        ([key, val]) =>
          variant.options?.[key as keyof typeof variant.options] === val,
      );
    });

    if (matchingVariant) {
      setSelectedVariantId(matchingVariant.id);
      // Reset quantity to 1 when changing variants
      setQuantity(1);
    }
  };

  // Handle quantity change
  const handleQuantityChange = (newQuantity: number) => {
    // Clamp between 1 and remaining stock
    const clamped = Math.min(remainingStock, Math.max(1, newQuantity));
    setQuantity(clamped);
  };

  const handleIncrement = () => {
    if (quantity < remainingStock) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = () => {
    if (!canAddMore) return;

    addItem(
      {
        productId: product.id,
        variantId: selectedVariantId,
        productName: product.name,
        variantName: selectedVariant?.name ?? null,
        price: displayPrice,
        imageUrl: product.images[0]?.url ?? null,
        sku: selectedVariant?.sku ?? null,
        maxInventory, // Pass max for validation
      },
      quantity, // Add the selected quantity
    );

    // Show feedback
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);

    // Reset quantity to 1
    setQuantity(1);
  };

  const inStock = hasVariants
    ? selectedVariant
      ? selectedVariant.inventoryQty > 0
      : false
    : !product.trackInventory ||
      (product.allowBackorders ?? false) ||
      (product.inventoryQty ?? 0) > 0;

  const showLowStockWarning = remainingStock > 0 && remainingStock < 10;

  return {
    selectedVariantId,
    quantity,
    justAdded,
    handleOptionSelect,
    handleQuantityChange,
    handleIncrement,
    handleDecrement,
    handleAddToCart,
    inStock,
    showLowStockWarning,
    formatPrice,
    variantOptions,
    selectedOptions,
    isHydrated,
    cartQuantity,
    remainingStock,
    canAddMore,
    selectedVariant,
    displayPrice,
    setQuantity,
    setSelectedVariantId,
  };
}

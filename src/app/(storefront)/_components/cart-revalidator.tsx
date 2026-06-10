"use client";

import { useEffect, useRef } from "react";

import { useCart } from "~/providers/cart-context";
import { api } from "~/trpc/react";

/**
 * Invisible component that reconciles the localStorage cart against live
 * server values whenever the cart is hydrated and non-empty.
 *
 * Placement: rendered once inside the storefront layout, which sits inside
 * both <CartProvider> and <TRPCReactProvider>.
 *
 * Loop-safety:
 * - The query input is keyed by (productId, variantId) IDs only — prices are
 *   excluded so a reconcile-driven price update never re-triggers the query.
 * - `reconcile()` guards setItems: it returns the existing array reference
 *   unchanged when nothing has changed, preventing unnecessary re-renders.
 */
export function CartRevalidator() {
  const { items, isHydrated, reconcile } = useCart();

  // Build a stable query input keyed by ids only.
  // We memoize manually using a ref so that price/qty changes (driven by
  // reconcile itself) don't produce a new array reference and re-fire the query.
  const prevKeyRef = useRef<string>("");
  const idsRef = useRef<{ productId: string; variantId: string | null }[]>([]);
  const currentKey = items
    .map((i) => `${i.productId}:${i.variantId ?? ""}`)
    .join(",");
  if (currentKey !== prevKeyRef.current) {
    prevKeyRef.current = currentKey;
    idsRef.current = items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
    }));
  }
  const ids = idsRef.current;

  const { data } = api.product.getCartItemsStatus.useQuery(
    { items: ids },
    {
      enabled: isHydrated && ids.length > 0,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  );

  useEffect(() => {
    if (!data) return;
    reconcile(data);
  }, [data, reconcile]);

  return null;
}

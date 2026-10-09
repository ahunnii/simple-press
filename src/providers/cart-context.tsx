/* eslint-disable @typescript-eslint/restrict-template-expressions */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

import { ANALYTICS_EVENTS, track } from "~/lib/umami/track";

export type CartItem = {
  productId: string;
  productSlug?: string | null;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  price: number; // in cents (the actual sale/current price)
  compareAtPrice?: number | null; // in cents (the original price, for strikethrough display)
  quantity: number;
  imageUrl: string | null;
  sku: string | null;
  maxInventory?: number; // Optional: for validation
  /**
   * Set when this line was added as an add-on for another line (e.g. a charm
   * picked on a glove's page): that parent's `cartLineKey`. Part of the line's
   * identity, so the same charm picked for two gloves stays two lines.
   * Server-side checkout ignores it.
   */
  addOnFor?: string;
};

/**
 * Which lines of a product/variant a cart call targets:
 * - `undefined` (omitted): every line of it, standalone or add-on
 * - `null`: only the standalone line (no `addOnFor`)
 * - a string: only the add-on line for that parent `cartLineKey`
 */
export type CartLineScope = string | null | undefined;

/** Stable key for a product/variant, used as an add-on's `addOnFor` value. */
export function cartLineKey(productId: string, variantId: string | null) {
  return `${productId}:${variantId ?? "base"}`;
}

/** Unique id for one cart line (React keys etc.); includes `addOnFor`. */
export function cartItemId(item: CartItem) {
  const key = cartLineKey(item.productId, item.variantId);
  return item.addOnFor ? `${key}@${item.addOnFor}` : key;
}

/** Whether `item` is a line of productId/variantId within `scope`. */
export function matchesCartLine(
  item: CartItem,
  productId: string,
  variantId: string | null,
  scope?: CartLineScope,
) {
  if (item.productId !== productId || item.variantId !== variantId) {
    return false;
  }
  return scope === undefined || (item.addOnFor ?? null) === scope;
}

/** Quantity of productId/variantId held by every line except `exclude`. */
function quantityElsewhere(
  items: CartItem[],
  productId: string,
  variantId: string | null,
  exclude: CartItem | undefined,
) {
  return items.reduce(
    (sum, item) =>
      item !== exclude && matchesCartLine(item, productId, variantId)
        ? sum + item.quantity
        : sum,
    0,
  );
}

export type CartItemSnapshot = {
  productId: string;
  variantId: string | null;
  available: boolean;
  price: number;
  compareAtPrice: number | null;
  maxQuantity: number | null;
  slug?: string | null;
};

type CartContextType = {
  items: CartItem[];
  isHydrated: boolean; // Track if cart has loaded from localStorage
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (
    productId: string,
    variantId: string | null,
    scope?: CartLineScope,
  ) => void;
  /** Remove a standalone line and every add-on line added for it. */
  removeItemWithAddOns: (productId: string, variantId: string | null) => void;
  updateQuantity: (
    productId: string,
    variantId: string | null,
    quantity: number,
    scope?: CartLineScope,
  ) => void;
  incrementItem: (
    productId: string,
    variantId: string | null,
    scope?: CartLineScope,
  ) => void;
  decrementItem: (
    productId: string,
    variantId: string | null,
    scope?: CartLineScope,
  ) => void;
  clearCart: () => void;
  isInCart: (
    productId: string,
    variantId: string | null,
    scope?: CartLineScope,
  ) => boolean;
  /** Summed across the matching lines (all of them when `scope` is omitted). */
  getItemQuantity: (
    productId: string,
    variantId: string | null,
    scope?: CartLineScope,
  ) => number;
  total: number;
  itemCount: number;

  isOpen: boolean;
  setIsOpen: (open: boolean) => void;

  subtotal: number;

  /**
   * Reconcile the cart against a fresh snapshot from the server.
   * - Removes items that are unavailable or absent from the snapshot.
   * - Updates price, compareAtPrice, maxInventory for available items.
   * - Clamps quantity down to maxQuantity when finite.
   * - Shows at most one toast (removal takes priority over price change).
   * - No-ops if nothing changed (reference-stable setItems call avoided).
   */
  reconcile: (snapshots: CartItemSnapshot[]) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "shopping-cart";

/** Parse a raw localStorage value into cart items; null when unusable. */
function parseStoredCartItems(raw: string | null): CartItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((item): item is CartItem => {
      if (typeof item !== "object" || item === null) return false;
      const c = item as Record<string, unknown>;
      return (
        typeof c.productId === "string" &&
        (c.variantId === null || typeof c.variantId === "string") &&
        typeof c.productName === "string" &&
        (c.variantName === null || typeof c.variantName === "string") &&
        typeof c.price === "number" &&
        typeof c.quantity === "number" &&
        (c.imageUrl === null || typeof c.imageUrl === "string") &&
        (c.sku === null || typeof c.sku === "string") &&
        (c.addOnFor === undefined || typeof c.addOnFor === "string")
      );
    });
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Load cart from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = parseStoredCartItems(
        localStorage.getItem(CART_STORAGE_KEY),
      );
      if (saved) {
        setItems(saved);
      } else if (localStorage.getItem(CART_STORAGE_KEY) !== null) {
        // Clear corrupted/malformed data
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error);
      // Clear corrupted data
      localStorage.removeItem(CART_STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save cart to localStorage whenever it changes (after hydration)
  useEffect(() => {
    if (!isHydrated) return; // Don't save until we've loaded

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
      toast.error("Failed to save cart");
    }
  }, [items, isHydrated]);

  // Check if item is in cart
  const isInCart = useCallback(
    (productId: string, variantId: string | null, scope?: CartLineScope) => {
      return items.some((item) =>
        matchesCartLine(item, productId, variantId, scope),
      );
    },
    [items],
  );

  // Get quantity of specific item (stock checks want every line of it)
  const getItemQuantity = useCallback(
    (productId: string, variantId: string | null, scope?: CartLineScope) => {
      return items.reduce(
        (sum, item) =>
          matchesCartLine(item, productId, variantId, scope)
            ? sum + item.quantity
            : sum,
        0,
      );
    },
    [items],
  );

  // Add item to cart
  const addItem = useCallback(
    (newItem: Omit<CartItem, "quantity">, quantity = 1) => {
      let toastMsg: string | null = null;
      let toastIsError = false;
      let openCart = false;

      setItems((currentItems) => {
        toastMsg = null;
        toastIsError = false;
        openCart = false;

        const existingIndex = currentItems.findIndex((item) =>
          matchesCartLine(
            item,
            newItem.productId,
            newItem.variantId,
            newItem.addOnFor ?? null,
          ),
        );
        // Stock is shared by every line of the product (an add-on line and a
        // standalone line of the same charm draw on the same inventory).
        const elsewhere = quantityElsewhere(
          currentItems,
          newItem.productId,
          newItem.variantId,
          currentItems[existingIndex],
        );

        if (existingIndex > -1) {
          const updated = [...currentItems];
          const newQuantity = updated[existingIndex]!.quantity + quantity;

          if (
            newItem.maxInventory != null &&
            elsewhere + newQuantity > newItem.maxInventory
          ) {
            toastMsg = `Only ${newItem.maxInventory} available in stock`;
            toastIsError = true;
            return currentItems;
          }

          updated[existingIndex] = {
            ...updated[existingIndex]!,
            quantity: newQuantity,
          };

          toastMsg = `Updated quantity in cart`;
          return updated;
        }

        if (
          newItem.maxInventory != null &&
          elsewhere + quantity > newItem.maxInventory
        ) {
          toastMsg = `Only ${newItem.maxInventory} available in stock`;
          toastIsError = true;
          return currentItems;
        }

        toastMsg = `${newItem.productName} added to cart`;
        openCart = true;
        return [...currentItems, { ...newItem, quantity }];
      });

      if (toastMsg !== null) {
        if (toastIsError) toast.error(toastMsg);
        else toast.success(toastMsg);
      }
      if (openCart) setIsOpen(true);

      // Fire analytics event when item was successfully added or quantity updated
      if (!toastIsError && toastMsg !== null) {
        track(ANALYTICS_EVENTS.ADD_TO_CART, {
          productId: newItem.productId,
          name: newItem.productName,
        });
      }
    },
    [],
  );

  // Remove item from cart
  const removeItem = useCallback(
    (productId: string, variantId: string | null, scope?: CartLineScope) => {
      let removed = false;

      setItems((currentItems) => {
        removed = false;
        const filtered = currentItems.filter(
          (item) => !matchesCartLine(item, productId, variantId, scope),
        );
        if (filtered.length < currentItems.length) removed = true;
        return filtered;
      });

      if (removed) toast.success("Removed from cart");
    },
    [],
  );

  // Remove a standalone line together with the add-ons picked for it
  const removeItemWithAddOns = useCallback(
    (productId: string, variantId: string | null) => {
      const parentKey = cartLineKey(productId, variantId);
      let removed = false;

      setItems((currentItems) => {
        removed = false;
        const filtered = currentItems.filter(
          (item) =>
            !matchesCartLine(item, productId, variantId, null) &&
            item.addOnFor !== parentKey,
        );
        if (filtered.length < currentItems.length) removed = true;
        return filtered;
      });

      if (removed) toast.success("Removed from cart");
    },
    [],
  );

  // Update quantity
  const updateQuantity = useCallback(
    (
      productId: string,
      variantId: string | null,
      quantity: number,
      scope?: CartLineScope,
    ) => {
      if (quantity <= 0) {
        removeItem(productId, variantId, scope);
        return;
      }

      let maxInventoryHit: number | null = null;

      setItems((currentItems) => {
        maxInventoryHit = null;
        return currentItems.map((item) => {
          if (matchesCartLine(item, productId, variantId, scope)) {
            const elsewhere =
              scope === undefined
                ? 0
                : quantityElsewhere(currentItems, productId, variantId, item);
            if (
              item.maxInventory != null &&
              elsewhere + quantity > item.maxInventory
            ) {
              maxInventoryHit = item.maxInventory;
              return item;
            }
            return { ...item, quantity };
          }
          return item;
        });
      });

      if (maxInventoryHit !== null)
        toast.error(`Only ${maxInventoryHit} available in stock`);
    },
    [removeItem],
  );

  // Increment item quantity
  const incrementItem = useCallback(
    (productId: string, variantId: string | null, scope?: CartLineScope) => {
      let maxInventoryHit: number | null = null;

      setItems((currentItems) => {
        maxInventoryHit = null;
        return currentItems.map((item) => {
          if (matchesCartLine(item, productId, variantId, scope)) {
            const newQuantity = item.quantity + 1;
            const elsewhere =
              scope === undefined
                ? 0
                : quantityElsewhere(currentItems, productId, variantId, item);

            if (
              item.maxInventory != null &&
              elsewhere + newQuantity > item.maxInventory
            ) {
              maxInventoryHit = item.maxInventory;
              return item;
            }

            return { ...item, quantity: newQuantity };
          }
          return item;
        });
      });

      if (maxInventoryHit !== null)
        toast.error(`Only ${maxInventoryHit} available in stock`);
    },
    [],
  );

  // Decrement item quantity
  const decrementItem = useCallback(
    (productId: string, variantId: string | null, scope?: CartLineScope) => {
      let removed = false;

      setItems((currentItems) => {
        removed = false;
        return currentItems
          .map((item) => {
            if (matchesCartLine(item, productId, variantId, scope)) {
              const newQuantity = item.quantity - 1;

              if (newQuantity <= 0) {
                removed = true;
                return null;
              }

              return { ...item, quantity: newQuantity };
            }
            return item;
          })
          .filter((item): item is CartItem => item !== null);
      });

      if (removed) toast.success("Removed from cart");
    },
    [],
  );

  // Clear entire cart
  const clearCart = useCallback(() => {
    setItems([]);

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(CART_STORAGE_KEY);
      } catch (error) {
        console.error("Failed to clear cart from localStorage:", error);
      }
    }

    toast.success("Cart cleared");
  }, []);

  // Reconcile cart against a fresh server snapshot — additive (no CartItem shape change)
  const reconcile = useCallback((snapshots: CartItemSnapshot[]) => {
    const snapshotMap = new Map(
      snapshots.map((s) => [`${s.productId}-${s.variantId ?? ""}`, s]),
    );

    let itemsRemoved = false;
    let priceChanged = false;

    setItems((currentItems) => {
      itemsRemoved = false;
      priceChanged = false;

      const next: CartItem[] = [];

      for (const item of currentItems) {
        const key = `${item.productId}-${item.variantId ?? ""}`;
        const snap = snapshotMap.get(key);

        // Remove items with no snapshot or explicitly unavailable
        if (!snap?.available) {
          itemsRemoved = true;
          continue;
        }

        // Detect price change
        const newPrice = snap.price;
        const newCompare = snap.compareAtPrice;
        const newMaxInv = snap.maxQuantity ?? undefined;

        if (
          newPrice !== item.price ||
          newCompare !== (item.compareAtPrice ?? null)
        ) {
          priceChanged = true;
        }

        // Clamp quantity to maxQuantity if finite
        const clampedQty =
          snap.maxQuantity !== null
            ? Math.min(item.quantity, snap.maxQuantity)
            : item.quantity;

        next.push({
          ...item,
          productSlug: item.productSlug ?? snap.slug ?? null,
          price: newPrice,
          compareAtPrice: newCompare,
          maxInventory: newMaxInv,
          quantity: clampedQty,
        });
      }

      // Reference-stable guard: if nothing changed, return the same array
      if (
        !itemsRemoved &&
        !priceChanged &&
        next.length === currentItems.length
      ) {
        // Check quantities weren't clamped and slug wasn't backfilled either
        const unchanged = next.every(
          (n, i) =>
            n.quantity === currentItems[i]?.quantity &&
            (n.productSlug ?? null) === (currentItems[i]?.productSlug ?? null),
        );
        if (unchanged) return currentItems;
      }

      return next;
    });

    // Show at most one toast after state update (read flags set above)
    // Using a microtask so we read the final flag values after setItems callback
    Promise.resolve()
      .then(() => {
        if (itemsRemoved) {
          toast(
            "Some items in your cart are no longer available and were removed.",
          );
        } else if (priceChanged) {
          toast("Some prices in your cart were updated.");
        }
      })
      .catch(() => undefined);
  }, []);

  // Calculate total
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Calculate item count
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        items,
        isHydrated,
        addItem,
        removeItem,
        removeItemWithAddOns,
        updateQuantity,
        incrementItem,
        decrementItem,
        clearCart,
        isInCart,
        getItemQuantity,
        total,
        itemCount,
        isOpen,
        setIsOpen,
        subtotal,
        reconcile,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

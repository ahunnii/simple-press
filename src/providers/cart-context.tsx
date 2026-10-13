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

import type { CustomizerSelection } from "~/lib/customizer";
import {
  configKey as computeConfigKey,
  normalizeSelection,
} from "~/lib/customizer";
import { ANALYTICS_EVENTS, track } from "~/lib/umami/track";
import { customizerSelectionSchema } from "~/lib/validators/product-options";

/**
 * Display-only description of a configured line's choices, computed in the
 * browser when the line is added (`useProductCustomizer().toCartFields()`).
 * UNTRUSTED: it comes from localStorage, so it is only ever rendered as
 * text, and the server never reads it (it re-prices `configuration`).
 */
export type CartItemCustomization = {
  summary: string;
  lines: { label: string; value: string; price: number }[];
};

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
  /**
   * Product customizer choices (ids + raw text). Present only on a
   * CONFIGURED line; the provider stores it normalized and drops an empty
   * one, so a line with `configuration` always has a non-empty `configKey`.
   */
  configuration?: CustomizerSelection;
  /**
   * `configKey(configuration)` — part of the line's identity. Always
   * recomputed by the provider (on add and on load), never trusted from the
   * caller or storage. Absent / "" = a plain line.
   */
  configKey?: string;
  /** Display-only summary of `configuration` (see `CartItemCustomization`). */
  customization?: CartItemCustomization;
};

/**
 * Which lines of a product/variant a product+variant cart call targets:
 * - `undefined` (omitted): every PLAIN line of it, standalone or add-on
 * - `null`: only the standalone plain line (no `addOnFor`)
 * - a string: only the plain add-on line for that parent `cartLineKey`
 *
 * Configured lines (product customizer, `configKey` set) are never targeted
 * by a scope: the product+variant mutators (`removeItem`, `updateQuantity`,
 * `incrementItem`, `decrementItem`, `removeItemWithAddOns`) cannot touch
 * them, so a template written before options existed can't wipe or resize
 * someone's build by product id. Configured lines are changed only through
 * the line-id APIs (`removeLine`, `updateLineQuantity`) with
 * `cartItemId(item)`. The READ helpers (`isInCart`, `getItemQuantity`) with
 * an omitted scope still count every line, configured included, because a
 * configured line draws on the same base stock.
 */
export type CartLineScope = string | null | undefined;

/** Stable key for a product/variant, used as an add-on's `addOnFor` value. */
export function cartLineKey(productId: string, variantId: string | null) {
  return `${productId}:${variantId ?? "base"}`;
}

/** The line's configuration key ("" for a plain line). */
export function lineConfigKey(
  item: Pick<CartItem, "configKey" | "configuration">,
): string {
  if (item.configKey !== undefined) return item.configKey;
  return item.configuration ? computeConfigKey(item.configuration) : "";
}

/** A product-customizer line (has a non-empty configuration). */
export function isConfiguredLine(
  item: Pick<CartItem, "configKey" | "configuration">,
): boolean {
  return lineConfigKey(item) !== "";
}

/**
 * Unique id for one cart line (React keys, `removeLine`,
 * `updateLineQuantity`): product + variant, then `~configKey` for a
 * configured line, then `@addOnFor` for a legacy add-on line. A plain line's
 * id is unchanged from before options existed.
 */
export function cartItemId(
  item: Pick<
    CartItem,
    "productId" | "variantId" | "addOnFor" | "configKey" | "configuration"
  >,
) {
  const key = cartLineKey(item.productId, item.variantId);
  const config = lineConfigKey(item);
  const withConfig = config ? `${key}~${config}` : key;
  return item.addOnFor ? `${withConfig}@${item.addOnFor}` : withConfig;
}

/** Most characters the checkout accepts in a `lineKey`. */
const CHECKOUT_LINE_KEY_MAX = 64;

/**
 * The `lineKey` sent to checkout for this line, echoed back when the server
 * rejects it so exactly that line can be removed. The line id when it fits
 * the server's 64-char cap (two cuids + a config key do not), otherwise a
 * stable 16-hex hash of it. Map an echoed key back with
 * `findLineByCheckoutKey`.
 */
export function checkoutLineKey(
  item: Pick<
    CartItem,
    "productId" | "variantId" | "addOnFor" | "configKey" | "configuration"
  >,
) {
  const id = cartItemId(item);
  if (id.length <= CHECKOUT_LINE_KEY_MAX) return id;
  return `h:${fnv1a(id, 0x811c9dc5)}${fnv1a(id, 0x050c5d1f)}`;
}

export function findLineByCheckoutKey<T extends CartItem>(
  items: readonly T[],
  lineKey: string,
): T | undefined {
  return items.find((item) => checkoutLineKey(item) === lineKey);
}

function fnv1a(input: string, seed: number): string {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * Whether `item` is a line of productId/variantId within `scope`. An omitted
 * scope matches EVERY line, configured included (stock reads); a `null` or
 * string scope only ever matches plain lines.
 */
export function matchesCartLine(
  item: CartItem,
  productId: string,
  variantId: string | null,
  scope?: CartLineScope,
) {
  if (item.productId !== productId || item.variantId !== variantId) {
    return false;
  }
  if (scope === undefined) return true;
  if (isConfiguredLine(item)) return false;
  return (item.addOnFor ?? null) === scope;
}

/**
 * What a product+variant MUTATOR may touch: `matchesCartLine` minus every
 * configured line (see `CartLineScope`).
 */
function isLegacyTarget(
  item: CartItem,
  productId: string,
  variantId: string | null,
  scope: CartLineScope,
) {
  return (
    !isConfiguredLine(item) &&
    matchesCartLine(item, productId, variantId, scope)
  );
}

/** Quantity of productId/variantId held by every line except `exclude`. */
function quantityElsewhere(
  items: CartItem[],
  productId: string,
  variantId: string | null,
  exclude: (item: CartItem) => boolean,
) {
  return items.reduce(
    (sum, item) =>
      !exclude(item) && matchesCartLine(item, productId, variantId)
        ? sum + item.quantity
        : sum,
    0,
  );
}

/**
 * Normalize an incoming line: a non-empty configuration is stored
 * normalized with its recomputed key; an empty one (and any stray
 * `configKey`/`customization`) is dropped so the line is plain.
 */
function prepareLine<T extends Omit<CartItem, "quantity">>(item: T): T {
  const { configuration: rawConfig, customization, ...rest } = item;
  delete rest.configKey; // always recomputed below
  const configuration = rawConfig ? normalizeSelection(rawConfig) : null;
  const key = configuration ? computeConfigKey(configuration) : "";
  if (!configuration || key === "") return rest as T;
  return {
    ...rest,
    configuration,
    configKey: key,
    ...(customization ? { customization } : {}),
  } as T;
}

export type CartItemSnapshot = {
  productId: string;
  variantId: string | null;
  /**
   * The line's configuration key as the server computed it ("" or absent =
   * a plain line). Snapshots are matched to lines by product + variant +
   * this key, so each configured build gets its own price/availability.
   */
  configKey?: string;
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
  /**
   * Remove one line by `cartItemId(item)` — the only way (with
   * `updateLineQuantity`) to change a configured line. Use these for every
   * cart row.
   */
  removeLine: (lineId: string) => void;
  /** Set one line's quantity by `cartItemId(item)`; `<= 0` removes it. */
  updateLineQuantity: (lineId: string, quantity: number) => void;
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
   * Reconcile the cart against a fresh snapshot from the server. Snapshots
   * match lines by product + variant + `configKey`.
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

/**
 * Parse a raw localStorage value into cart items; null when unusable.
 *
 * Product customizer fields are validated too. A line whose `configuration`
 * or `customization` is malformed is DROPPED, not stripped: stripping the
 * configuration would turn a customized build into a plain line charged at
 * the base price, silently losing what the shopper chose. `configKey` is
 * always recomputed from the configuration, never trusted.
 */
export function parseStoredCartItems(raw: string | null): CartItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.flatMap((item): CartItem[] => {
      if (typeof item !== "object" || item === null) return [];
      const c = item as Record<string, unknown>;
      const basic =
        typeof c.productId === "string" &&
        (c.variantId === null || typeof c.variantId === "string") &&
        typeof c.productName === "string" &&
        (c.variantName === null || typeof c.variantName === "string") &&
        typeof c.price === "number" &&
        typeof c.quantity === "number" &&
        (c.imageUrl === null || typeof c.imageUrl === "string") &&
        (c.sku === null || typeof c.sku === "string") &&
        (c.addOnFor === undefined || typeof c.addOnFor === "string");
      if (!basic) return [];

      const { configuration, customization, ...rest } = c;
      delete rest.configKey; // recomputed by prepareLine, never trusted
      if (configuration === undefined) {
        // A plain line: any stray customization is meaningless.
        return [rest as CartItem];
      }
      const selection = customizerSelectionSchema.safeParse(configuration);
      if (!selection.success) return [];
      if (customization !== undefined && !isCustomization(customization)) {
        return [];
      }
      return [
        prepareLine({
          ...(rest as Omit<CartItem, "quantity">),
          configuration: selection.data,
          ...(customization !== undefined
            ? { customization: customization }
            : {}),
        }) as CartItem,
      ];
    });
  } catch {
    return null;
  }
}

function isCustomization(value: unknown): value is CartItemCustomization {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.summary === "string" &&
    Array.isArray(v.lines) &&
    v.lines.every((line: unknown) => {
      if (typeof line !== "object" || line === null) return false;
      const l = line as Record<string, unknown>;
      return (
        typeof l.label === "string" &&
        typeof l.value === "string" &&
        typeof l.price === "number"
      );
    })
  );
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

  // Add item to cart. Merges into an existing line only when the FULL line
  // id matches (product, variant, configuration, add-on parent): the same
  // build bumps its line, a different build of the same variant is a new one.
  const addItem = useCallback(
    (rawItem: Omit<CartItem, "quantity">, quantity = 1) => {
      const newItem = prepareLine(rawItem);
      const newId = cartItemId(newItem);
      let toastMsg: string | null = null;
      let toastIsError = false;
      let openCart = false;

      setItems((currentItems) => {
        toastMsg = null;
        toastIsError = false;
        openCart = false;

        const existingIndex = currentItems.findIndex(
          (item) => cartItemId(item) === newId,
        );
        const existing = currentItems[existingIndex];
        // Stock is shared by every line of the product (an add-on line, a
        // standalone line and a configured build of the same variant all
        // draw on the same inventory).
        const elsewhere = quantityElsewhere(
          currentItems,
          newItem.productId,
          newItem.variantId,
          (item) => item === existing,
        );

        if (existing) {
          const updated = [...currentItems];
          const newQuantity = existing.quantity + quantity;

          if (
            newItem.maxInventory != null &&
            elsewhere + newQuantity > newItem.maxInventory
          ) {
            toastMsg = `Only ${newItem.maxInventory} available in stock`;
            toastIsError = true;
            return currentItems;
          }

          updated[existingIndex] = { ...existing, quantity: newQuantity };

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

  // Remove the plain lines of a product/variant (never a configured line —
  // see `CartLineScope`)
  const removeItem = useCallback(
    (productId: string, variantId: string | null, scope?: CartLineScope) => {
      let removed = false;

      setItems((currentItems) => {
        removed = false;
        const filtered = currentItems.filter(
          (item) => !isLegacyTarget(item, productId, variantId, scope),
        );
        if (filtered.length < currentItems.length) removed = true;
        return filtered;
      });

      if (removed) toast.success("Removed from cart");
    },
    [],
  );

  // Remove exactly one line by its `cartItemId`
  const removeLine = useCallback((lineId: string) => {
    let removed = false;

    setItems((currentItems) => {
      removed = false;
      const filtered = currentItems.filter(
        (item) => cartItemId(item) !== lineId,
      );
      if (filtered.length < currentItems.length) removed = true;
      return filtered;
    });

    if (removed) toast.success("Removed from cart");
  }, []);

  // Remove a standalone line together with the add-ons picked for it
  const removeItemWithAddOns = useCallback(
    (productId: string, variantId: string | null) => {
      const parentKey = cartLineKey(productId, variantId);
      let removed = false;

      setItems((currentItems) => {
        removed = false;
        const filtered = currentItems.filter(
          (item) =>
            !isLegacyTarget(item, productId, variantId, null) &&
            !(item.addOnFor === parentKey && !isConfiguredLine(item)),
        );
        if (filtered.length < currentItems.length) removed = true;
        return filtered;
      });

      if (removed) toast.success("Removed from cart");
    },
    [],
  );

  // Update quantity of the plain lines of a product/variant
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
        const targeted = (item: CartItem) =>
          isLegacyTarget(item, productId, variantId, scope);
        return currentItems.map((item) => {
          if (targeted(item)) {
            // Every line this call does not set (other builds, other
            // scopes) still holds stock.
            const elsewhere = quantityElsewhere(
              currentItems,
              productId,
              variantId,
              targeted,
            );
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

  // Set one line's quantity by its `cartItemId`
  const updateLineQuantity = useCallback(
    (lineId: string, quantity: number) => {
      if (quantity <= 0) {
        removeLine(lineId);
        return;
      }

      let maxInventoryHit: number | null = null;

      setItems((currentItems) => {
        maxInventoryHit = null;
        const line = currentItems.find((item) => cartItemId(item) === lineId);
        if (!line || line.quantity === quantity) return currentItems;
        const elsewhere = quantityElsewhere(
          currentItems,
          line.productId,
          line.variantId,
          (item) => item === line,
        );
        if (
          line.maxInventory != null &&
          quantity > line.quantity &&
          elsewhere + quantity > line.maxInventory
        ) {
          maxInventoryHit = line.maxInventory;
          return currentItems;
        }
        return currentItems.map((item) =>
          item === line ? { ...item, quantity } : item,
        );
      });

      if (maxInventoryHit !== null)
        toast.error(`Only ${maxInventoryHit} available in stock`);
    },
    [removeLine],
  );

  // Increment the plain lines of a product/variant
  const incrementItem = useCallback(
    (productId: string, variantId: string | null, scope?: CartLineScope) => {
      let maxInventoryHit: number | null = null;

      setItems((currentItems) => {
        maxInventoryHit = null;
        const targeted = (item: CartItem) =>
          isLegacyTarget(item, productId, variantId, scope);
        return currentItems.map((item) => {
          if (targeted(item)) {
            const newQuantity = item.quantity + 1;
            const elsewhere = quantityElsewhere(
              currentItems,
              productId,
              variantId,
              targeted,
            );

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

  // Decrement the plain lines of a product/variant
  const decrementItem = useCallback(
    (productId: string, variantId: string | null, scope?: CartLineScope) => {
      let removed = false;

      setItems((currentItems) => {
        removed = false;
        return currentItems
          .map((item) => {
            if (isLegacyTarget(item, productId, variantId, scope)) {
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

  // Reconcile cart against a fresh server snapshot. Keyed per line (product,
  // variant, configKey), so each configured build takes only its own price,
  // stock cap and availability.
  const reconcile = useCallback((snapshots: CartItemSnapshot[]) => {
    const snapshotMap = new Map(
      snapshots.map((s) => [
        `${s.productId}-${s.variantId ?? ""}-${s.configKey ?? ""}`,
        s,
      ]),
    );

    let itemsRemoved = false;
    let priceChanged = false;

    setItems((currentItems) => {
      itemsRemoved = false;
      priceChanged = false;

      const next: CartItem[] = [];

      for (const item of currentItems) {
        const key = `${item.productId}-${item.variantId ?? ""}-${lineConfigKey(item)}`;
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
        removeLine,
        updateLineQuantity,
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

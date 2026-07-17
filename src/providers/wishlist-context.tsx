"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

export type WishlistItem = {
  productId: string;
  name: string;
  slug: string;
  price: number; // in cents (price at the time of saving — may go stale)
  imageUrl: string | null;
  addedAt: string; // ISO timestamp
};

type WishlistContextType = {
  items: WishlistItem[];
  isHydrated: boolean; // Track if wishlist has loaded from localStorage
  has: (productId: string) => boolean;
  toggle: (item: Omit<WishlistItem, "addedAt">) => void;
  remove: (productId: string) => void;
  count: number;
};

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined,
);

const WISHLIST_STORAGE_KEY = "wishlist";

/** Parse a raw localStorage value into wishlist items; null when unusable. */
function parseStoredItems(raw: string | null): WishlistItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (item): item is WishlistItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as WishlistItem).productId === "string" &&
        typeof (item as WishlistItem).name === "string" &&
        typeof (item as WishlistItem).slug === "string" &&
        typeof (item as WishlistItem).price === "number",
    );
  } catch {
    return null;
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load wishlist from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = parseStoredItems(
        localStorage.getItem(WISHLIST_STORAGE_KEY),
      );
      if (saved) {
        setItems(saved);
      } else if (localStorage.getItem(WISHLIST_STORAGE_KEY) !== null) {
        // Clear corrupted data
        localStorage.removeItem(WISHLIST_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Failed to load wishlist from localStorage:", error);
      localStorage.removeItem(WISHLIST_STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save wishlist to localStorage whenever it changes (after hydration)
  useEffect(() => {
    if (!isHydrated) return; // Don't save until we've loaded

    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save wishlist to localStorage:", error);
    }
  }, [items, isHydrated]);

  // Multi-tab sync: `storage` events only fire in OTHER tabs, so applying the
  // new value directly cannot loop back into this tab's save effect.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onStorage = (event: StorageEvent) => {
      if (event.key !== WISHLIST_STORAGE_KEY) return;
      setItems(parseStoredItems(event.newValue) ?? []);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const has = useCallback(
    (productId: string) => items.some((item) => item.productId === productId),
    [items],
  );

  const toggle = useCallback((item: Omit<WishlistItem, "addedAt">) => {
    let added = false;

    setItems((currentItems) => {
      added = false;
      const exists = currentItems.some(
        (existing) => existing.productId === item.productId,
      );
      if (exists) {
        return currentItems.filter(
          (existing) => existing.productId !== item.productId,
        );
      }
      added = true;
      return [...currentItems, { ...item, addedAt: new Date().toISOString() }];
    });

    if (added) toast.success(`${item.name} saved to wishlist`);
    else toast.success("Removed from wishlist");
  }, []);

  const remove = useCallback((productId: string) => {
    let removed = false;

    setItems((currentItems) => {
      removed = false;
      const filtered = currentItems.filter(
        (item) => item.productId !== productId,
      );
      if (filtered.length < currentItems.length) removed = true;
      return filtered;
    });

    if (removed) toast.success("Removed from wishlist");
  }, []);

  const count = items.length;

  return (
    <WishlistContext.Provider
      value={{ items, isHydrated, has, toggle, remove, count }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}

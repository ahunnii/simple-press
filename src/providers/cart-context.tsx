// "use client";

// import { createContext, useContext, useEffect, useState } from "react";

// type CartItem = {
//   productId: string;
//   variantId: string | null;
//   productName: string;
//   variantName: string | null;
//   price: number; // in cents
//   quantity: number;
//   imageUrl: string | null;
//   sku?: string;
// };

// type CartContextType = {
//   items: CartItem[];
//   addItem: (item: Omit<CartItem, "quantity">) => void;
//   removeItem: (productId: string, variantId: string | null) => void;
//   updateQuantity: (
//     productId: string,
//     variantId: string | null,
//     quantity: number,
//   ) => void;
//   clearCart: () => void;
//   total: number;
//   itemCount: number;
// };

// const CartContext = createContext<CartContextType | undefined>(undefined);

// export function CartProvider({ children }: { children: React.ReactNode }) {
//   const [items, setItems] = useState<CartItem[]>([]);
//   const [isHydrated, setIsHydrated] = useState(false);

//   useEffect(() => {
//     // Load first
//     const saved = localStorage.getItem("cart");
//     if (saved) setItems(JSON.parse(saved));
//     setIsHydrated(true); // Mark as loaded
//   }, []);

//   useEffect(() => {
//     if (!isHydrated) return; // DON'T save until loaded!
//     localStorage.setItem("cart", JSON.stringify(items));
//   }, [items, isHydrated]);

//   // Save cart to localStorage whenever it changes
//   useEffect(() => {
//     localStorage.setItem("cart", JSON.stringify(items));
//   }, [items]);

//   const addItem = (newItem: Omit<CartItem, "quantity">) => {
//     setItems((currentItems) => {
//       // Check if item already exists
//       const existingIndex = currentItems.findIndex(
//         (item) =>
//           item.productId === newItem.productId &&
//           item.variantId === newItem.variantId,
//       );

//       if (existingIndex > -1) {
//         // Item exists, increment quantity
//         const updated = [...currentItems];
//         updated[existingIndex].quantity += 1;
//         return updated;
//       }

//       // New item, add with quantity 1
//       return [...currentItems, { ...newItem, quantity: 1 }];
//     });
//   };

//   const removeItem = (productId: string, variantId: string | null) => {
//     setItems((currentItems) =>
//       currentItems.filter(
//         (item) =>
//           !(item.productId === productId && item.variantId === variantId),
//       ),
//     );
//   };

//   const updateQuantity = (
//     productId: string,
//     variantId: string | null,
//     quantity: number,
//   ) => {
//     if (quantity <= 0) {
//       removeItem(productId, variantId);
//       return;
//     }

//     setItems((currentItems) =>
//       currentItems.map((item) =>
//         item.productId === productId && item.variantId === variantId
//           ? { ...item, quantity }
//           : item,
//       ),
//     );
//   };

//   const clearCart = () => {
//     setItems([]);
//   };

//   const total = items.reduce(
//     (sum, item) => sum + item.price * item.quantity,
//     0,
//   );

//   const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

//   return (
//     <CartContext.Provider
//       value={{
//         items,
//         addItem,
//         removeItem,
//         updateQuantity,
//         clearCart,
//         total,
//         itemCount,
//       }}
//     >
//       {children}
//     </CartContext.Provider>
//   );
// }

// export function useCart() {
//   const context = useContext(CartContext);
//   if (context === undefined) {
//     throw new Error("useCart must be used within a CartProvider");
//   }
//   return context;
// }

// providers/cart-context.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

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
};

type CartContextType = {
  items: CartItem[];
  isHydrated: boolean; // Track if cart has loaded from localStorage
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQuantity: (
    productId: string,
    variantId: string | null,
    quantity: number,
  ) => void;
  incrementItem: (productId: string, variantId: string | null) => void;
  decrementItem: (productId: string, variantId: string | null) => void;
  clearCart: () => void;
  isInCart: (productId: string, variantId: string | null) => boolean;
  getItemQuantity: (productId: string, variantId: string | null) => number;
  total: number;
  itemCount: number;

  isOpen: boolean;
  setIsOpen: (open: boolean) => void;

  subtotal: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "shopping-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Load cart from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart) as CartItem[];
        setItems(parsed);
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

  // Generate unique key for cart item
  // const getItemKey = (productId: string, variantId: string | null) => {
  //   return `${productId}-${variantId ?? "no-variant"}`;
  // };

  // Check if item is in cart
  const isInCart = useCallback(
    (productId: string, variantId: string | null) => {
      return items.some(
        (item) => item.productId === productId && item.variantId === variantId,
      );
    },
    [items],
  );

  // Get quantity of specific item
  const getItemQuantity = useCallback(
    (productId: string, variantId: string | null) => {
      const item = items.find(
        (item) => item.productId === productId && item.variantId === variantId,
      );
      return item?.quantity ?? 0;
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

        const existingIndex = currentItems.findIndex(
          (item) =>
            item.productId === newItem.productId &&
            item.variantId === newItem.variantId,
        );

        if (existingIndex > -1) {
          const updated = [...currentItems];
          const newQuantity = updated[existingIndex]!.quantity + quantity;

          if (newItem.maxInventory && newQuantity > newItem.maxInventory) {
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

        if (newItem.maxInventory && quantity > newItem.maxInventory) {
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
    },
    [],
  );

  // Remove item from cart
  const removeItem = useCallback(
    (productId: string, variantId: string | null) => {
      let removed = false;

      setItems((currentItems) => {
        removed = false;
        const filtered = currentItems.filter(
          (item) =>
            !(item.productId === productId && item.variantId === variantId),
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
    (productId: string, variantId: string | null, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId, variantId);
        return;
      }

      let maxInventoryHit: number | null = null;

      setItems((currentItems) => {
        maxInventoryHit = null;
        return currentItems.map((item) => {
          if (item.productId === productId && item.variantId === variantId) {
            if (item.maxInventory && quantity > item.maxInventory) {
              maxInventoryHit = item.maxInventory;
              return item;
            }
            return { ...item, quantity };
          }
          return item;
        });
      });

      if (maxInventoryHit !== null) toast.error(`Only ${maxInventoryHit} available in stock`);
    },
    [removeItem],
  );

  // Increment item quantity
  const incrementItem = useCallback(
    (productId: string, variantId: string | null) => {
      let maxInventoryHit: number | null = null;

      setItems((currentItems) => {
        maxInventoryHit = null;
        return currentItems.map((item) => {
          if (item.productId === productId && item.variantId === variantId) {
            const newQuantity = item.quantity + 1;

            if (item.maxInventory && newQuantity > item.maxInventory) {
              maxInventoryHit = item.maxInventory;
              return item;
            }

            return { ...item, quantity: newQuantity };
          }
          return item;
        });
      });

      if (maxInventoryHit !== null) toast.error(`Only ${maxInventoryHit} available in stock`);
    },
    [],
  );

  // Decrement item quantity
  const decrementItem = useCallback(
    (productId: string, variantId: string | null) => {
      let removed = false;

      setItems((currentItems) => {
        removed = false;
        return currentItems
          .map((item) => {
            if (item.productId === productId && item.variantId === variantId) {
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
    toast.success("Cart cleared");
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

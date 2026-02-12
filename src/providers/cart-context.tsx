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

type CartItem = {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  price: number; // in cents
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
  const getItemKey = (productId: string, variantId: string | null) => {
    return `${productId}-${variantId ?? "no-variant"}`;
  };

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
      setItems((currentItems) => {
        const existingIndex = currentItems.findIndex(
          (item) =>
            item.productId === newItem.productId &&
            item.variantId === newItem.variantId,
        );

        if (existingIndex > -1) {
          // Item exists, update quantity
          const updated = [...currentItems];
          const newQuantity = updated[existingIndex]!.quantity + quantity;

          // Check max inventory if provided
          if (newItem.maxInventory && newQuantity > newItem.maxInventory) {
            toast.error(`Only ${newItem.maxInventory} available in stock`);
            return currentItems;
          }

          updated[existingIndex] = {
            ...updated[existingIndex]!,
            quantity: newQuantity,
          };

          toast.success(`Updated quantity in cart`);
          return updated;
        }

        // New item, add to cart
        if (newItem.maxInventory && quantity > newItem.maxInventory) {
          toast.error(`Only ${newItem.maxInventory} available in stock`);
          return currentItems;
        }

        toast.success(`Added to cart`);
        setIsOpen(true);
        return [...currentItems, { ...newItem, quantity }];
      });
    },
    [],
  );

  // Remove item from cart
  const removeItem = useCallback(
    (productId: string, variantId: string | null) => {
      setItems((currentItems) => {
        const filtered = currentItems.filter(
          (item) =>
            !(item.productId === productId && item.variantId === variantId),
        );

        if (filtered.length < currentItems.length) {
          toast.success("Removed from cart");
        }

        return filtered;
      });
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

      setItems((currentItems) => {
        return currentItems.map((item) => {
          if (item.productId === productId && item.variantId === variantId) {
            // Check max inventory
            if (item.maxInventory && quantity > item.maxInventory) {
              toast.error(`Only ${item.maxInventory} available in stock`);
              return item;
            }

            return { ...item, quantity };
          }
          return item;
        });
      });
    },
    [removeItem],
  );

  // Increment item quantity
  const incrementItem = useCallback(
    (productId: string, variantId: string | null) => {
      setItems((currentItems) => {
        return currentItems.map((item) => {
          if (item.productId === productId && item.variantId === variantId) {
            const newQuantity = item.quantity + 1;

            if (item.maxInventory && newQuantity > item.maxInventory) {
              toast.error(`Only ${item.maxInventory} available in stock`);
              return item;
            }

            return { ...item, quantity: newQuantity };
          }
          return item;
        });
      });
    },
    [],
  );

  // Decrement item quantity
  const decrementItem = useCallback(
    (productId: string, variantId: string | null) => {
      setItems((currentItems) => {
        return currentItems
          .map((item) => {
            if (item.productId === productId && item.variantId === variantId) {
              const newQuantity = item.quantity - 1;

              if (newQuantity <= 0) {
                toast.success("Removed from cart");
                return null;
              }

              return { ...item, quantity: newQuantity };
            }
            return item;
          })
          .filter((item): item is CartItem => item !== null);
      });
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

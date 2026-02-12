/* eslint-disable @typescript-eslint/restrict-template-expressions */
"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { HydrateClient } from "~/trpc/server";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { useCart } from "~/providers/cart-context";

export function ElegantCartDrawer() {
  const {
    items,
    removeItem,
    updateQuantity,
    isOpen,
    setIsOpen,
    itemCount,
    subtotal,
    isHydrated,
  } = useCart();

  const shipping = 0;
  const total = subtotal + shipping;

  if (!isHydrated) {
    return null;
  }

  return (
    <>
      <Drawer open={isOpen} onOpenChange={setIsOpen} direction="right">
        <DrawerContent className="h-full w-full sm:max-w-[440px]">
          <DrawerHeader className="border-border/50 border-b p-6 py-2.5">
            <DrawerTitle className="font-serif text-2xl">Cart</DrawerTitle>
            <DrawerDescription>
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </DrawerDescription>
          </DrawerHeader>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <ShoppingBag className="text-muted-foreground/50 mb-4 h-12 w-12" />
                <p className="text-muted-foreground">Your cart is empty</p>
                <DrawerClose asChild>
                  <button
                    type="button"
                    className="text-primary mt-4 text-sm hover:underline"
                  >
                    Continue Shopping
                  </button>
                </DrawerClose>
              </div>
            ) : (
              <div className="space-y-6">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-4">
                    {/* Product Image */}
                    <div className="bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={item.imageUrl ?? "/placeholder.svg"}
                        alt={item.productName}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-foreground mb-1 font-serif text-base font-semibold">
                        {item.productName}
                      </h3>
                      <p className="text-muted-foreground mb-3 text-sm">
                        {item.variantName}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3">
                        <div className="border-border flex items-center rounded-full border">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.variantId,
                                item.quantity - 1,
                              )
                            }
                            className="hover:bg-muted boty-transition rounded-l-full p-1.5"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-3 text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.variantId,
                                item.quantity + 1,
                              )
                            }
                            className="hover:bg-muted boty-transition rounded-r-full p-1.5"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeItem(item.productId, item.variantId)
                          }
                          className="text-muted-foreground hover:text-destructive boty-transition p-1.5"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="text-foreground font-medium">
                        ${item.price * item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <DrawerFooter className="border-border/50 gap-4 border-t p-6">
              {/* Summary */}
              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal}</span>
                </div>
                <div className="text-muted-foreground flex justify-between">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? "Free" : `$${shipping}`}</span>
                </div>
                <div className="text-foreground border-border/50 flex justify-between border-t pt-2 text-base font-medium">
                  <span>Total</span>
                  <span>${total}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <DrawerClose asChild>
                <Link
                  href="/checkout"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 boty-transition flex w-full items-center justify-center rounded-full py-4 font-medium"
                >
                  Checkout
                </Link>
              </DrawerClose>

              <DrawerClose asChild>
                <Link
                  href="/cart"
                  className="border-border text-foreground hover:bg-muted boty-transition flex w-full items-center justify-center rounded-full border py-4 font-medium"
                >
                  View Cart
                </Link>
              </DrawerClose>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { ShippingConfig } from "~/lib/shipping-utils";
import { formatPrice } from "~/lib/prices";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { useCart } from "~/providers/cart-context";

import { NoiseCartSummary } from "./noise-cart-summary";

type NoiseCartDrawerProps = {
  shippingConfig: ShippingConfig;
};

export function NoiseCartDrawer({ shippingConfig }: NoiseCartDrawerProps) {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex w-full flex-col rounded-none border-l border-border bg-background sm:max-w-lg">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="flex items-center gap-2 font-sans text-[10px] tracking-[0.3em] uppercase text-foreground">
            <ShoppingBag className="h-4 w-4" />
            Your Cart
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
            <div>
              <p className="font-serif text-xl font-light text-foreground">
                Your cart is empty
              </p>
              <p className="mt-1 font-sans text-xs text-muted-foreground">
                Add pieces from the collection
              </p>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              asChild
              className="rounded-none font-sans text-[10px] tracking-[0.25em] uppercase"
            >
              <Link href="/shop">Browse the Collection</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={`${item.productId}-${item.variantId ?? "base"}`}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex gap-4 border-b border-border py-4"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-muted">
                      <Image
                        src={item.imageUrl ?? "/placeholder.svg"}
                        alt={item.productName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-serif text-sm font-light text-foreground">
                            {item.productName}
                            {item.variantName ? ` — ${item.variantName}` : ""}
                          </h4>
                          <p className="font-sans text-xs text-muted-foreground">
                            {formatPrice(item.price)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-none text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.productId, item.variantId)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="mt-1 flex items-center gap-1 border border-border self-start">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-none"
                          onClick={() =>
                            updateQuantity(item.productId, item.variantId, item.quantity - 1)
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-7 text-center font-sans text-xs">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-none"
                          onClick={() =>
                            updateQuantity(item.productId, item.variantId, item.quantity + 1)
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="border-t border-border px-4 pb-4 pt-2">
              <NoiseCartSummary shippingConfig={shippingConfig} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

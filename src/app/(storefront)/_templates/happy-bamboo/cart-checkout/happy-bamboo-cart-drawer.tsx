"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { ShippingConfig } from "~/lib/shipping-utils";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { useCart } from "~/providers/cart-context";

import { HappyBambooCartSummary } from "./happy-bamboo-cart-summary";

type HappyBambooCartDrawerProps = {
  shippingConfig: ShippingConfig;
  /** Title at the top of the cart panel. */
  cartLabel: string;
  /** Line under "Your cart is empty". Blank hides it. */
  cartEmptyText: string;
};

export function HappyBambooCartDrawer({
  shippingConfig,
  cartLabel,
  cartEmptyText,
}: HappyBambooCartDrawerProps) {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem } = useCart();
  const reducedMotion = useReducedMotion();

  // The sheet portals to document.body by default, which escapes the
  // .happy-bamboo scope class — the --hb-* tokens, theme-palette overrides
  // (inline vars on the wrapper) and the Outfit/Spectral font variables would
  // all resolve to nothing. Portal into the template wrapper instead.
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setContainer(document.querySelector<HTMLElement>("main.happy-bamboo"));
  }, []);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        container={container}
        className="flex w-full flex-col sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            <span {...fieldAttr("happy-bamboo.global.cart-label")}>
              {cartLabel}
            </span>
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
            <ShoppingBag
              className="text-muted-foreground/50 h-16 w-16"
              aria-hidden="true"
            />
            <p className="text-muted-foreground">Your cart is empty</p>
            {!!cartEmptyText && (
              <p
                className="text-muted-foreground max-w-xs text-center text-sm"
                {...fieldAttr("happy-bamboo.global.cart-empty-text")}
              >
                {cartEmptyText}
              </p>
            )}
            <Button onClick={() => setIsOpen(false)} asChild>
              <Link href="/shop">Continue Shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={`${item.productId}-${item.variantId ?? "base"}`}
                    layout
                    initial={
                      reducedMotion
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0, x: 20 }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    exit={
                      reducedMotion
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0, x: -20 }
                    }
                    transition={reducedMotion ? { duration: 0 } : undefined}
                    className="flex gap-4 py-4"
                  >
                    <div className="bg-muted relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={item.imageUrl ?? "/placeholder.svg"}
                        alt={item.productName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">
                          {item.productName}
                          {item.variantName ? ` - ${item.variantName}` : ""}
                        </h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            removeItem(item.productId, item.variantId)
                          }
                          aria-label={`Remove ${item.productName} from cart`}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {formatPrice(item.price)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.variantId,
                              item.quantity - 1,
                            )
                          }
                          aria-label={`Decrease quantity of ${item.productName}`}
                        >
                          <Minus className="h-3 w-3" aria-hidden="true" />
                        </Button>
                        <span
                          className="w-8 text-center"
                          aria-live="polite"
                          aria-atomic="true"
                        >
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.variantId,
                              item.quantity + 1,
                            )
                          }
                          aria-label={`Increase quantity of ${item.productName}`}
                        >
                          <Plus className="h-3 w-3" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="border-t px-4 pb-4">
              <HappyBambooCartSummary shippingConfig={shippingConfig} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

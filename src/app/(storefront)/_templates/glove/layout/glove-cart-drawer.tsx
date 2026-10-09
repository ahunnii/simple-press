"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import { formatPrice } from "~/lib/prices";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "~/components/ui/sheet";
import { cartItemId, useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { groupGloveCartLines } from "../cart-checkout/glove-cart-groups";
import { gloveButtonClass } from "../shared/glove-button";
import { GloveHandIcon } from "../shared/glove-hand-icon";
import { GloveCartItem } from "./glove-cart-item";

/**
 * Right slide-over cart (B7). Opens from the header cart button via
 * `useCart().setIsOpen`. Portaled INTO the `.glove` wrapper so the tokens and
 * font variables resolve (the default body portal escapes the scope).
 */
export function GloveCartDrawer() {
  const { items, subtotal, itemCount, isOpen, setIsOpen } = useCart();
  const { isEnabled } = useStorefrontFlags();
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(document.querySelector<HTMLElement>(".glove"));
  }, []);

  const close = () => setIsOpen(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        container={container}
        showCloseButton={false}
        className="glove-body w-[calc(100vw-2.5rem)] gap-0 border-l border-[var(--glove-line)] bg-[var(--glove-paper)] text-[var(--glove-text)] sm:max-w-[420px]"
      >
        <div className="flex items-center justify-between border-b border-[var(--glove-line)] px-5 py-4">
          <SheetTitle className="glove-display text-[17px] font-semibold text-[var(--glove-ink)]">
            Your bag
            {itemCount > 0 ? (
              <span className="ml-2 text-[13px] font-normal text-[var(--glove-muted)]">
                ({itemCount} {itemCount === 1 ? "item" : "items"})
              </span>
            ) : null}
          </SheetTitle>
          <SheetClose
            className="-mr-2 inline-flex size-11 items-center justify-center text-[var(--glove-ink)] transition-colors hover:text-[var(--glove-primary)]"
            aria-label="Close bag"
          >
            <X className="size-5" aria-hidden="true" />
          </SheetClose>
        </div>
        <SheetDescription className="sr-only">
          Items in your bag, with quantity controls and checkout links.
        </SheetDescription>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <GloveHandIcon className="size-16 text-[var(--glove-primary-tint)]" />
            <p className="glove-display text-[16px] font-medium text-[var(--glove-ink)]">
              Your bag is waiting for its first pair
            </p>
            {isEnabled("products") ? (
              <Link
                href="/shop"
                onClick={close}
                className={gloveButtonClass({ variant: "woo" })}
              >
                Start shopping
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto px-5 py-1">
              {groupGloveCartLines(items).map(({ item, addOns, total }) => (
                <GloveCartItem
                  key={cartItemId(item)}
                  item={item}
                  addOns={addOns}
                  groupTotal={total}
                  onNavigate={close}
                />
              ))}
            </ul>
            <div className="border-t border-[var(--glove-line)] px-5 pt-4 pb-5">
              <p className="flex items-baseline justify-between text-[15px] text-[var(--glove-ink)]">
                <span className="glove-display font-medium">Subtotal</span>
                <span className="text-[18px] font-bold text-[var(--glove-primary)]">
                  {formatPrice(subtotal)}
                </span>
              </p>
              <div className="mt-4 flex flex-col items-stretch gap-1">
                {isEnabled("checkout") ? (
                  <Link
                    href="/checkout"
                    onClick={close}
                    className={gloveButtonClass({
                      variant: "woo",
                      fullWidth: true,
                    })}
                  >
                    Check out
                  </Link>
                ) : null}
                <Link
                  href="/cart"
                  onClick={close}
                  className="glove-body inline-flex min-h-11 items-center justify-center text-[14px] font-medium text-[var(--glove-ink)] underline decoration-[var(--glove-muted)] underline-offset-4 transition-colors hover:text-[var(--glove-primary)] hover:decoration-current"
                >
                  View bag
                </Link>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

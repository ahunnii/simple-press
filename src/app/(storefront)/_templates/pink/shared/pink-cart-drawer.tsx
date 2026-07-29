"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag } from "lucide-react";

import { formatPrice } from "~/lib/prices";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { useCart } from "~/providers/cart-context";

import { PINK_SCOPE_CLASS } from "../layout/pink-scope";

type PinkCartDrawerProps = {
  /**
   * Theme-preset CSS vars from `resolveThemeVars("pink", customFields)`.
   * The drawer portals out of the layout wrapper that normally carries them,
   * so the caller has to hand them over or presets skip the drawer.
   */
  themeVars?: React.CSSProperties;
  /** Owner-editable copy — resolved by the caller. */
  title?: string;
  emptyHeading?: string;
  emptyBody?: string;
  browseLabel?: string;
  checkoutLabel?: string;
  noteText?: string;
};

/**
 * The right-hand `min(430px,100%)` ink drawer: header with count, line
 * items with a `1px` stepper, subtotal, checkout + keep-shopping buttons
 * (design.md → Shared component inventory). Wraps the shared `Sheet`
 * primitive (Radix Dialog under the hood) for the scrim, focus trap and
 * Escape-to-close behaviour — mirrors `noise/cart-checkout/noise-cart-drawer.tsx`.
 * Reads cart state exclusively from `useCart` — never reimplement it.
 */
export function PinkCartDrawer({
  themeVars,
  title = "Your basket",
  emptyHeading = "Your basket is empty.",
  emptyBody = "Anything you add will appear here.",
  browseLabel = "Browse the shop →",
  checkoutLabel = "Checkout",
  noteText = "Shipping and taxes are calculated at checkout.",
}: PinkCartDrawerProps) {
  const { items, subtotal, isOpen, setIsOpen, updateQuantity, removeItem } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* `SheetContent` portals to document.body, escaping the `.pink` wrapper
          in `PinkLayout`. Without re-applying the scope here, every
          `var(--pink-*)` below resolves to nothing (transparent panel, page
          showing through) and `.pink .pink-btn` stops matching, so the checkout
          button loses its fill and padding entirely. `pink-dark` additionally
          switches the ghost/solid button and input variants to their
          dark-surface forms — the drawer is an ink surface. */}
      <SheetContent
        className={`${PINK_SCOPE_CLASS} pink-dark flex w-full flex-col gap-0 rounded-none border-0 p-0 sm:max-w-[430px]`}
        style={{
          ...themeVars,
          background: "var(--pink-ink)",
          color: "var(--pink-paper)",
          borderLeft: "1px solid var(--pink-ink-line)",
        }}
      >
        <SheetHeader
          className="flex-none px-6 py-5"
          style={{ borderBottom: "1px solid var(--pink-ink-line)" }}
        >
          <SheetTitle asChild>
            <div className="flex items-center justify-between">
              <span
                className="pink-display"
                style={{ fontSize: "18px", fontWeight: 600, color: "var(--pink-paper)" }}
              >
                {title}
              </span>
              {itemCount > 0 && (
                <span className="pink-label-dark">
                  {itemCount} {itemCount === 1 ? "piece" : "pieces"}
                </span>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <ShoppingBag className="h-6 w-6" style={{ color: "var(--pink-ink-line-strong)" }} />
            <div className="flex flex-col gap-1.5">
              <p
                className="pink-display"
                style={{ fontSize: "18px", fontWeight: 600, color: "var(--pink-paper)" }}
              >
                {emptyHeading}
              </p>
              <p className="text-[13px]" style={{ color: "var(--pink-ink-muted)" }}>
                {emptyBody}
              </p>
            </div>
            <Link
              href="/shop"
              onClick={() => setIsOpen(false)}
              className="mt-2 text-[13px] font-medium transition-opacity hover:opacity-80"
              style={{ color: "var(--pink-blush)" }}
            >
              {browseLabel}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId ?? "base"}`}
                  className="grid items-start gap-3.5 px-6 py-4"
                  style={{
                    gridTemplateColumns: "64px 1fr auto",
                    borderBottom: "1px solid var(--pink-ink-line)",
                  }}
                >
                  <div
                    className="relative shrink-0 overflow-hidden"
                    style={{ width: 64, aspectRatio: "4 / 5", background: "var(--pink-ink-tint)" }}
                  >
                    <Image
                      src={item.imageUrl ?? "/placeholder.svg"}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>

                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="truncate text-[13px] font-medium" style={{ color: "var(--pink-paper)" }}>
                      {item.productName}
                    </p>
                    {item.variantName && (
                      <p className="text-[11px]" style={{ color: "var(--pink-ink-subtle)" }}>
                        {item.variantName}
                      </p>
                    )}
                    <div
                      className="mt-1 flex w-fit items-center"
                      style={{ border: "1px solid var(--pink-ink-line-strong)" }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.variantId, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                        className="flex h-8 w-8 items-center justify-center disabled:opacity-30"
                        style={{ color: "var(--pink-paper)" }}
                      >
                        <Minus className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <span
                        className="w-7 text-center text-[13px]"
                        style={{ color: "var(--pink-paper)" }}
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.variantId, item.quantity + 1)
                        }
                        aria-label="Increase quantity"
                        className="flex h-8 w-8 items-center justify-center"
                        style={{ color: "var(--pink-paper)" }}
                      >
                        <Plus className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.variantId)}
                      className="mt-0.5 w-fit text-[11px] underline underline-offset-2 transition-opacity hover:opacity-70"
                      style={{ color: "var(--pink-ink-muted)" }}
                    >
                      Remove
                    </button>
                  </div>

                  <span className="shrink-0 text-[13px] font-medium" style={{ color: "var(--pink-paper)" }}>
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="flex flex-none flex-col gap-3 px-6 py-5"
              style={{ borderTop: "1px solid var(--pink-ink-line)" }}
            >
              <div className="flex items-baseline justify-between">
                <span className="pink-label-dark">Subtotal</span>
                <span className="pink-display" style={{ fontSize: "16px", fontWeight: 600, color: "var(--pink-paper)" }}>
                  {formatPrice(subtotal)}
                </span>
              </div>

              <Link
                href="/checkout"
                onClick={() => setIsOpen(false)}
                className="pink-btn pink-btn-solid w-full justify-between"
              >
                <span>{checkoutLabel}</span>
                <span>{formatPrice(subtotal)} →</span>
              </Link>

              {noteText && (
                <p className="text-center text-[12px]" style={{ color: "var(--pink-ink-subtle)" }}>
                  {noteText}
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

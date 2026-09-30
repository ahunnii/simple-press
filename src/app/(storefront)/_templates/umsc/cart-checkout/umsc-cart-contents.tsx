"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import type { TemplateListRow } from "~/lib/template-fields";
import { navHrefFlag } from "~/app/(storefront)/_components/nav";
import { fieldAttr, listItemAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { UMSC_CART_DEFAULT_DOORS } from "./cart-fields";
import { UmscButton } from "../shared/umsc-button";
import { UmscCollectionDoor } from "../shared/umsc-collection-door";
import {
  hasCustomImage,
  UmscImageFallback,
} from "../shared/umsc-image-fallback";

// Re-exported so the pre-migration import path (and the snapshot test) keep
// working — the rows themselves now live in `./cart-fields.ts`'s `defaultRows`.
export { UMSC_CART_DEFAULT_DOORS };

type Props = {
  emptyHeading: string;
  emptyBody: string;
  emptyShopAllLabel: string;
  continueShoppingLabel: string;
  checkoutCta: string;
  /** Parsed `umsc.cart.empty-doors` list rows — empty when the owner hasn't saved rows. */
  doorRows: TemplateListRow[];
};

export function UmscCartContents({
  emptyHeading,
  emptyBody,
  emptyShopAllLabel,
  continueShoppingLabel,
  checkoutCta,
  doorRows,
}: Props) {
  const { items, incrementItem, decrementItem, removeItem, total, isHydrated } =
    useCart();
  // B2.1/B2.5 (PF15, PF16): the empty-bag doors, the "Shop all" way out, the
  // populated bag's "Continue shopping" link, and the checkout CTA all point
  // at routes that 404 when their feature is off — every one of them must be
  // flag-checked, never just re-pointed.
  const { isEnabled } = useStorefrontFlags();
  const shopFlag = navHrefFlag("/shop");
  const shopEnabled = shopFlag === null || isEnabled(shopFlag);

  // ── Hydration guard — neutral skeleton prevents empty→filled flash ──────────
  if (!isHydrated) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-6">
        {[1, 2].map((n) => (
          <div
            key={n}
            className="h-[100px] rounded-[var(--radius)] bg-[var(--umsc-cream)]"
          />
        ))}
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (items.length === 0) {
    const rawDoors =
      doorRows.length > 0
        ? doorRows.slice(0, 4).map((row, i) => ({
            title:
              typeof row.title === "string" && row.title
                ? row.title
                : (UMSC_CART_DEFAULT_DOORS[i]?.title ?? ""),
            link:
              typeof row.link === "string" && row.link
                ? row.link
                : (UMSC_CART_DEFAULT_DOORS[i]?.link ?? "/shop"),
            image: typeof row.image === "string" ? row.image : undefined,
          }))
        : UMSC_CART_DEFAULT_DOORS;

    // PF15 / B2.5: a door whose link is gated off 404s on the demo (and on
    // any store without that collection) — hide it, never swap the
    // destination. `rowIndex` keeps `listItemAttr` pointed at the door's
    // real position in the saved list after filtering.
    const doors = rawDoors
      .map((door, rowIndex) => ({ ...door, rowIndex }))
      .filter((door) => {
        const flag = navHrefFlag(door.link);
        return flag === null || isEnabled(flag);
      });

    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="mb-8 size-24">
          <UmscImageFallback aspect="1 / 1" />
        </div>
        <h2
          {...fieldAttr("umsc.cart.empty-heading")}
          className="umsc-serif text-[clamp(26px,3.4vw,36px)] font-normal text-[var(--umsc-ink)]"
        >
          {emptyHeading}
        </h2>
        {emptyBody && (
          <p
            {...fieldAttr("umsc.cart.empty-body")}
            className="umsc-sans mt-3 max-w-[46ch] text-[15px] leading-[1.6] text-[var(--umsc-muted)]"
          >
            {emptyBody}
          </p>
        )}

        {shopEnabled && emptyShopAllLabel && (
          <UmscButton
            as="link"
            href="/shop"
            variant="gold"
            showArrow={false}
            fieldKey="umsc.cart.empty-shop-all-label"
            className="mt-8"
          >
            {emptyShopAllLabel}
          </UmscButton>
        )}

        {doors.length > 0 && (
          <div className="mt-10 grid w-full max-w-[880px] grid-cols-2 gap-5 text-left sm:grid-cols-4">
            {doors.map((door) => (
              <div
                key={door.title}
                {...listItemAttr("umsc.cart.empty-doors", door.rowIndex)}
              >
                <UmscCollectionDoor
                  href={door.link}
                  title={door.title}
                  image={door.image}
                  aspect="3 / 2"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Populated bag ────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_360px]">
      <h2 className="sr-only">Items in your bag</h2>
      <div role="list" aria-label="Items in your bag" className="flex flex-col">
        {items.map((item, index) => {
          const lineTotal = item.price * item.quantity;
          const productPath = `/shop/${item.productSlug ?? item.productId}`;
          return (
            <div
              key={`${item.productId}-${item.variantId ?? "no-variant"}`}
              role="listitem"
              className={cn(
                "flex gap-5 py-6",
                index === 0
                  ? "border-t-0"
                  : "border-t border-[var(--umsc-line)]",
              )}
            >
              <div className="relative size-[88px] shrink-0 overflow-hidden bg-[var(--umsc-cream)]">
                {hasCustomImage(item.imageUrl ?? undefined) ? (
                  <Image
                    src={item.imageUrl!}
                    alt=""
                    fill
                    sizes="88px"
                    className="object-cover"
                  />
                ) : (
                  <UmscImageFallback aspect="1 / 1" className="border-0" />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="umsc-sans text-[16px] font-semibold text-[var(--umsc-ink)]">
                      <Link
                        href={productPath}
                        className="hover:text-[var(--umsc-gold-ink)]"
                      >
                        {item.productName}
                      </Link>
                    </h3>
                    {item.variantName && (
                      <p className="umsc-sans mt-0.5 text-[13px] text-[var(--umsc-muted)]">
                        {item.variantName}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId, item.variantId)}
                    aria-label={`Remove ${item.productName}${item.variantName ? ` — ${item.variantName}` : ""} from bag`}
                    className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center text-[var(--umsc-muted)] hover:text-[var(--umsc-ink)]"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-auto flex items-center justify-between gap-4 pt-2">
                  <div
                    role="group"
                    aria-label={`Quantity for ${item.productName}${item.variantName ? ` — ${item.variantName}` : ""}`}
                    className="inline-flex h-11 w-[116px] items-center overflow-hidden border border-[var(--umsc-line)]"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        decrementItem(item.productId, item.variantId)
                      }
                      disabled={item.quantity <= 1}
                      aria-label={`Decrease quantity of ${item.productName}`}
                      className="umsc-sans flex h-full flex-1 items-center justify-center text-[16px] text-[var(--umsc-ink)] hover:not-disabled:bg-[var(--umsc-cream)] disabled:opacity-30"
                    >
                      <span aria-hidden="true">−</span>
                    </button>
                    <span
                      className="umsc-tabular umsc-sans w-8 text-center text-[14px] font-medium text-[var(--umsc-ink)]"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        incrementItem(item.productId, item.variantId)
                      }
                      disabled={
                        item.maxInventory !== undefined &&
                        item.quantity >= item.maxInventory
                      }
                      aria-label={`Increase quantity of ${item.productName}`}
                      className="umsc-sans flex h-full flex-1 items-center justify-center text-[16px] text-[var(--umsc-ink)] hover:not-disabled:bg-[var(--umsc-cream)] disabled:opacity-30"
                    >
                      <span aria-hidden="true">+</span>
                    </button>
                  </div>
                  <p className="umsc-tabular umsc-sans text-[15px] font-medium text-[var(--umsc-ink)]">
                    {formatPrice(lineTotal)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky order-summary card */}
      <aside aria-label="Order summary" className="lg:sticky lg:top-6">
        <div className="border border-[var(--umsc-line)] bg-[var(--umsc-white)] p-7">
          <h2 className="umsc-serif text-[18px] font-normal text-[var(--umsc-ink)]">
            Order summary
          </h2>

          <div className="mt-5 flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <span className="umsc-sans text-[14px] text-[var(--umsc-muted)]">
                Subtotal
              </span>
              <span className="umsc-tabular umsc-sans text-[14px] font-medium text-[var(--umsc-ink)]">
                {formatPrice(total)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="umsc-sans text-[14px] text-[var(--umsc-muted)]">
                Shipping
              </span>
              <span className="umsc-sans text-[14px] text-[var(--umsc-muted)]">
                Calculated at checkout
              </span>
            </div>
          </div>

          <div className="my-5 h-px bg-[var(--umsc-line)]" aria-hidden="true" />

          <div className="mb-7 flex items-baseline justify-between">
            <span className="umsc-serif text-[16px] font-normal text-[var(--umsc-ink)]">
              Estimated total
            </span>
            <span className="umsc-tabular umsc-serif text-[18px] font-normal text-[var(--umsc-ink)]">
              {formatPrice(total)}
            </span>
          </div>

          {/* PF16 / B7.4: hidden (not disabled) when checkout is off — the
              route 404s either way, so there is no destination to send the
              shopper to. */}
          {isEnabled("checkout") && (
            <UmscButton
              as="link"
              href="/checkout"
              variant="gold"
              showArrow={false}
              fieldKey="umsc.cart.checkout-cta"
              className="w-full justify-center"
            >
              {checkoutCta}
            </UmscButton>
          )}

          {shopEnabled && (
            <Link
              href="/shop"
              className="umsc-sans mt-4 block text-center text-[13px] text-[var(--umsc-muted)] underline underline-offset-[3px] hover:text-[var(--umsc-ink)]"
            >
              <span {...fieldAttr("umsc.cart.continue-shopping")}>
                {continueShoppingLabel}
              </span>
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}

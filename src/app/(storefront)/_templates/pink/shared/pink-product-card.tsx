"use client";

import Image from "next/image";
import Link from "next/link";

import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

import { PinkBadge } from "./pink-badge";
import { hasCustomImage, PinkImageFallback } from "./pink-image-fallback";

type PinkAddToBasketSlot = {
  label: string;
  addedLabel?: string;
  isAdded?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

type PinkProductCardProps = {
  href: string;
  imageUrl?: string | null;
  imageAlt?: string;
  title: string;
  /** Secondary line under the title — material, category, or SKU. */
  meta?: string;
  /** Already-formatted — e.g. "$185", "Sold", "From $85". */
  price: string;
  /** Already-formatted strikethrough price, shown before `price` when on sale. */
  compareAtPrice?: string;
  badge?: { label: string; tone?: "rose" | "ink" };
  addToBasket?: PinkAddToBasketSlot;
  /**
   * Wishlist heart shown top-right of the image frame. Omit to render no
   * affordance (e.g. a card built from data with no stable product id).
   * `WishlistButton` self-gates on the `wishlist` feature flag, so passing
   * this costs nothing when the flag is off.
   */
  wishlist?: {
    productId: string;
    slug: string;
    /** Raw numeric price — `price`/`compareAtPrice` above are already
        formatted strings for display and can't be reused for the wishlist
        snapshot. */
    rawPrice: number;
  };
  /**
   * Set on the first card or two of a grid. Product images are the LCP element
   * on `/shop` and on the homepage collection band, and without this Next.js
   * lazy-loads them behind their own siblings — it warns about exactly this in
   * the console (audit 2026-07-31, P2-8).
   */
  priority?: boolean;
  className?: string;
};

/**
 * 4:5 image + corner badge + `border-top: 1px solid var(--pink-ink)` meta
 * row with name/material left, price right; optional add-to-basket button
 * below (design.md → Shared component inventory). Consumed by shop,
 * collections, and related-product grids — deliberately decoupled from the
 * DB `Product` shape so every page maps its own data in.
 */
export function PinkProductCard({
  href,
  imageUrl,
  imageAlt = "",
  title,
  meta,
  price,
  compareAtPrice,
  badge,
  addToBasket,
  wishlist,
  priority = false,
  className,
}: PinkProductCardProps) {
  // The template has its own empty-image treatment; falling through to the
  // platform's generic `/placeholder.svg` put two different "no image yet"
  // graphics on one screen (audit 2026-07-31, P2-7).
  const hasImage = hasCustomImage(imageUrl);

  return (
    <div className={`group flex flex-col${className ? ` ${className}` : ""}`}>
      {/* Relative wrapper keeps the wishlist button a sibling of the card
          link (no <button> inside <a>) while overlaying the image's
          top-right corner — mirrors default-product-card.tsx. */}
      <div className="relative">
        {/* The title link below points at the same URL and carries the
            accessible name. When a product has no image the fallback renders no
            text, which left this anchor unnamed in the tab order — the same
            defect as the blog cards (audit 2026-07-31, P1-1), reintroduced here
            by the P2-7 fallback work and caught by the post-remediation re-audit.
            Hiding it also removes a duplicate tab stop per card.
            The badge is deliberately a SIBLING rather than a child: it carries
            real status ("Sold", "Featured"), so it must stay in the
            accessibility tree even though the image link does not. Same reason
            the wishlist button is a sibling. */}
        <Link
          href={href}
          aria-hidden="true"
          tabIndex={-1}
          className="pink-lift relative block overflow-hidden"
          style={{ aspectRatio: "4 / 5", background: "var(--pink-panel)" }}
        >
          {hasImage ? (
            <Image
              src={imageUrl!}
              alt={imageAlt}
              fill
              priority={priority}
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <PinkImageFallback surface="paper" className="absolute inset-0" />
          )}
        </Link>
        {badge && (
          <span className="absolute top-2.5 left-2.5 z-10">
            <PinkBadge tone={badge.tone}>{badge.label}</PinkBadge>
          </span>
        )}
        {wishlist && (
          <WishlistButton
            item={{
              productId: wishlist.productId,
              name: title,
              slug: wishlist.slug,
              price: wishlist.rawPrice,
              imageUrl: imageUrl ?? null,
            }}
            className="absolute top-2.5 right-2.5 z-10 size-8 rounded-none border border-[var(--pink-line)] bg-[var(--pink-white)] text-[var(--pink-ink)] shadow-none backdrop-blur-none hover:scale-100 hover:border-[var(--pink-rose)] hover:text-[var(--pink-rose)]"
          />
        )}
      </div>

      <div
        className="mt-3 flex items-baseline justify-between gap-3 pt-3"
        style={{ borderTop: "1px solid var(--pink-ink)" }}
      >
        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className="block truncate text-[15px] font-medium"
            style={{ color: "var(--pink-ink)" }}
          >
            {title}
          </Link>
          {meta && (
            <p
              className="truncate text-[13px]"
              style={{ color: "var(--pink-subtle)" }}
            >
              {meta}
            </p>
          )}
        </div>
        <div
          className="shrink-0 text-right text-[15px] font-medium"
          style={{ color: "var(--pink-ink)" }}
        >
          {compareAtPrice && (
            <span
              className="mr-1.5 line-through"
              style={{ color: "var(--pink-subtle)" }}
            >
              {compareAtPrice}
            </span>
          )}
          {price}
        </div>
      </div>

      {addToBasket && (
        <button
          type="button"
          onClick={addToBasket.onClick}
          disabled={addToBasket.disabled}
          aria-label={`${addToBasket.isAdded ? (addToBasket.addedLabel ?? "Added") : addToBasket.label} — ${title}`}
          className="pink-btn mt-3 w-full justify-center"
          style={
            addToBasket.isAdded
              ? {
                  background: "var(--pink-ink)",
                  borderColor: "var(--pink-ink)",
                  color: "var(--pink-paper)",
                }
              : {
                  background: "transparent",
                  borderColor: "var(--pink-ink)",
                  color: "var(--pink-ink)",
                }
          }
          onMouseEnter={(e) => {
            if (addToBasket.isAdded || addToBasket.disabled) return;
            e.currentTarget.style.borderColor = "var(--pink-rose)";
            e.currentTarget.style.color = "var(--pink-rose)";
          }}
          onMouseLeave={(e) => {
            if (addToBasket.isAdded || addToBasket.disabled) return;
            e.currentTarget.style.borderColor = "var(--pink-ink)";
            e.currentTarget.style.color = "var(--pink-ink)";
          }}
        >
          {addToBasket.isAdded
            ? (addToBasket.addedLabel ?? "Added ✓")
            : addToBasket.label}
        </button>
      )}
    </div>
  );
}

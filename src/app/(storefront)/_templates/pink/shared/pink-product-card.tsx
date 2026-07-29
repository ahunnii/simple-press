"use client";

import Image from "next/image";
import Link from "next/link";

import { PinkBadge } from "./pink-badge";

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
  className,
}: PinkProductCardProps) {
  const image = imageUrl ?? "/placeholder.svg";

  return (
    <div className={`group flex flex-col${className ? ` ${className}` : ""}`}>
      <Link
        href={href}
        className="pink-lift relative block overflow-hidden"
        style={{ aspectRatio: "4 / 5", background: "var(--pink-panel)" }}
      >
        <Image
          src={image}
          alt={imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {badge && (
          <span className="absolute top-2.5 left-2.5">
            <PinkBadge tone={badge.tone}>{badge.label}</PinkBadge>
          </span>
        )}
      </Link>

      <div
        className="mt-3 flex items-baseline justify-between gap-3 pt-3"
        style={{ borderTop: "1px solid var(--pink-ink)" }}
      >
        <div className="min-w-0 flex-1">
          <Link href={href} className="block truncate text-[15px] font-medium" style={{ color: "var(--pink-ink)" }}>
            {title}
          </Link>
          {meta && (
            <p className="truncate text-[13px]" style={{ color: "var(--pink-subtle)" }}>
              {meta}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right text-[15px] font-medium" style={{ color: "var(--pink-ink)" }}>
          {compareAtPrice && (
            <span className="mr-1.5 line-through" style={{ color: "var(--pink-subtle)" }}>
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
          {addToBasket.isAdded ? (addToBasket.addedLabel ?? "Added ✓") : addToBasket.label}
        </button>
      )}
    </div>
  );
}

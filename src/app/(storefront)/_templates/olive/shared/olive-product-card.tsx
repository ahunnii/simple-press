"use client";

import type { CSSProperties } from "react";
import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { OliveCartAddedDetail } from "../layout/olive-toast";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { photosOnly } from "~/lib/products/media";
import {
  readColorSwatches,
  swatchOverrideFor,
} from "~/lib/products/color-swatches";
import { cn } from "~/lib/utils";
import {
  resolveVariantCompareAtPrice,
  resolveVariantPrice,
} from "~/lib/variant-price";
import { useCartEnabled } from "~/hooks/use-cart-enabled";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { OLIVE_CART_ADDED_EVENT } from "../layout/olive-toast";
import { OliveChip } from "./olive-chip";
import { colorFromName, isColorOptionName } from "./olive-color";
import { hasOliveImage, OliveImageFallback } from "./olive-image-fallback";
import { OlivePrice } from "./olive-price";

/** One variant row, as the storefront queries actually return it. */
export type OliveCardVariant = {
  id: string;
  /** "Sage / M" — the only variant label some queries return. */
  name: string;
  price: number | null;
  compareAtPrice: number | null;
  inventoryQty: number;
  /**
   * `{ size: "M", color: "Sage" }`. Present on `product.getRelated` /
   * `product.get`; the shop query omits it, so the card falls back to reading
   * the variant name.
   */
  options?: unknown;
  imageUrl?: string | null;
  sku?: string | null;
};

/**
 * The minimum a product must carry to be drawn as a swatch card. Every
 * storefront product query in the repo is assignable to this: extra fields are
 * ignored, and the four optional blocks below are exactly the ones that differ
 * between queries.
 */
export type OliveCardProduct = {
  id: string;
  name: string;
  slug: string;
  /** Base price in cents. */
  price: number;
  compareAtPrice: number | null;
  trackInventory: boolean;
  inventoryQty: number;
  allowBackorders: boolean;
  /** JSON blob — `comingSoon` is read from it. */
  additionalFields?: unknown;
  /** Shared-pool products only. */
  baseUnitsConsumed?: number | null;
  baseInventoryUnit?: { inventoryQty: number } | null;
  /** Drives the "New" corner tab. Queries that do not select it simply get no tab. */
  createdAt?: Date | string | null;
  images: { url: string; altText?: string | null }[];
  /** Absent on `simplifiedGetWithProducts`, which selects no variants. */
  variants?: OliveCardVariant[];
  /** Product-options groups attached (`_count.optionGroups`); absent on queries that do not select it. */
  _count?: { optionGroups?: number | null } | null;
};

type OliveProductCardProps = {
  product: OliveCardProduct;
  /** Above-the-fold cards only — hands `priority` to the first image. */
  priority?: boolean;
  /** Heading level for the product name. Use 2 on pages whose grid sits directly under the h1. Default 3. */
  headingLevel?: 2 | 3;
  /** Position in an `OliveRevealGroup`; sets the `--i` stagger. */
  index?: number;
  /** Default true. Off for contexts where adding to the bag makes no sense. */
  showQuickAdd?: boolean;
  className?: string;
};

/** A product created inside this window earns the "New" tab. */
const NEW_WINDOW_DAYS = 30;
/** Colour dots on a card before the row collapses to "+N". */
const MAX_CARD_SWATCHES = 6;
/** How long the sr-only confirmation stays in the live region. */
const ANNOUNCE_MS = 2400;
/** How long the bar holds its espresso "committed" face (`.olive-quick-add-bar[data-commit]`). */
const COMMIT_MS = 460;

function isRecent(createdAt: Date | string | null | undefined): boolean {
  if (!createdAt) return false;
  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time < NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/** `{ size: "M", color: "Sage" }` when the row carries usable options. */
function variantOptions(
  variant: OliveCardVariant,
): Record<string, string> | null {
  const raw = variant.options;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim().length > 0) {
      out[key] = value.trim();
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** "Sage / M" → ["Sage", "M"]. */
function nameSegments(name: string): string[] {
  return name
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

type CardSwatch = {
  value: string;
  label: string;
  soldOut: boolean;
};

/**
 * The real colours this product comes in. Prefers the variant's own `color`
 * option; when the query omitted options it reads the variant name and keeps
 * only segments that resolve to a colour the template knows — so a "Small"
 * never becomes a chip, which is the whole chip discipline.
 */
function cardSwatches(
  variants: OliveCardVariant[],
  trackStock: boolean,
): CardSwatch[] {
  const anyOptions = variants.some((variant) => variantOptions(variant));
  const found = new Map<string, CardSwatch>();

  for (const variant of variants) {
    const options = variantOptions(variant);
    let value: string | null = null;

    if (options) {
      const key = Object.keys(options).find(isColorOptionName);
      value = key ? (options[key] ?? null) : null;
    } else if (!anyOptions) {
      value =
        nameSegments(variant.name).find((segment) => colorFromName(segment)) ??
        null;
    }

    if (!value) continue;

    const soldOut = trackStock && variant.inventoryQty <= 0;
    const key = value.toLowerCase();
    const seen = found.get(key);
    if (seen) {
      seen.soldOut = seen.soldOut && soldOut;
      continue;
    }
    found.set(key, { value: key, label: value, soldOut });
  }

  return Array.from(found.values());
}

type VariantChoice = { value: string; variant: OliveCardVariant };

/**
 * The variant list flattened to ONE dimension, or null when the product needs
 * two (size × colour) and therefore belongs on its own page. A single
 * dimension is the only case the in-card sheet can honestly represent.
 */
function singleDimensionChoices(
  variants: OliveCardVariant[],
): VariantChoice[] | null {
  if (variants.length === 0) return null;

  const keys = new Set<string>();
  let anyOptions = false;
  for (const variant of variants) {
    const options = variantOptions(variant);
    if (!options) continue;
    anyOptions = true;
    for (const key of Object.keys(options)) keys.add(key);
  }

  if (anyOptions) {
    if (keys.size !== 1) return null;
    const key = Array.from(keys)[0];
    if (!key) return null;
    const choices: VariantChoice[] = [];
    for (const variant of variants) {
      const value = variantOptions(variant)?.[key];
      if (value && !choices.some((choice) => choice.value === value)) {
        choices.push({ value, variant });
      }
    }
    return choices.length > 0 ? choices : null;
  }

  // No option data at all: the variant name is the only label there is, and
  // it only reads as one dimension when it has no separator.
  if (variants.some((variant) => nameSegments(variant.name).length !== 1)) {
    return null;
  }
  return variants.map((variant) => ({
    value: variant.name.trim(),
    variant,
  }));
}

/**
 * OliveProductCard — the lookbook card (design.md § Components).
 *
 * Frameless: a 3:4 photograph on a sand bed, then the name (Montserrat,
 * sentence case), the price and the product's real colours as 14px dots. No
 * frame, shadow or lift; the second photograph cross-fades in on hover, and a
 * small ivory tag top-left states stock or newness in words.
 *
 * Quick-add is a full-width bar pinned to the bottom of the photograph,
 * revealed on hover / focus-within for fine pointers (`.olive-quick-add` in
 * globals.css). On touch it is never drawn — the card links to the product
 * page — but it stays in the tab order and appears the moment it takes
 * keyboard focus. It is honest about what it can do: no variants → it adds;
 * one option dimension → a small sheet of choices opens over the bar; two
 * dimensions or option groups → it links to the product page. Coming-soon
 * and sold-out disable it outright — the same rule checkout enforces.
 */
export function OliveProductCard({
  product,
  priority = false,
  headingLevel = 3,
  index,
  showQuickAdd = true,
  className,
}: OliveProductCardProps) {
  const NameHeading = headingLevel === 2 ? "h2" : "h3";
  const { addItem } = useCart();
  const cartEnabled = useCartEnabled();
  const { isEnabled } = useStorefrontFlags();

  const [hovered, setHovered] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // The quick-add bar's press-commit — connects the click to the toast and
  // badge that follow, same idiom as `olive-buy-row.tsx`'s `onAdd`.
  const [committed, setCommitted] = useState(false);

  const cardRef = useRef<HTMLElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const sheetId = useId();

  const variants = product.variants ?? [];
  // A product with option groups needs a build before it can be bought, so
  // quick-add (including the one-dimension variant sheet) hands off to the
  // product page, like a two-dimension variant product.
  const hasOptions =
    isEnabled("productOptions") && (product._count?.optionGroups ?? 0) > 0;
  const status = checkProductStatus({
    hasOptions,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    trackInventory: product.trackInventory,
    inventoryQty: product.inventoryQty,
    allowBackorders: product.allowBackorders,
    baseInventoryUnit: product.baseInventoryUnit
      ? { inventoryQty: product.baseInventoryUnit.inventoryQty }
      : null,
    baseUnitsConsumed: product.baseUnitsConsumed ?? null,
    additionalFields: product.additionalFields,
    variants: variants.map((variant) => ({
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      inventoryQty: variant.inventoryQty,
    })),
  });

  const trackStock = product.trackInventory && !product.allowBackorders;
  const swatches = cardSwatches(variants, trackStock);
  // Owner-pinned hex per color; absent when the query omits additionalFields.
  const swatchOverrides = readColorSwatches(product.additionalFields);
  const visibleSwatches = swatches.slice(0, MAX_CARD_SWATCHES);
  const hiddenSwatches = swatches.length - visibleSwatches.length;
  const choices = hasOptions ? null : singleDimensionChoices(variants);

  const blocked = status.comingSoon || status.isOutOfStock;
  const href = `/shop/${product.slug}`;

  const cornerTab = status.comingSoon
    ? "Coming soon"
    : status.isOutOfStock
      ? "Sold out"
      : status.isBackorder
        ? "Pre-order"
        : isRecent(product.createdAt)
          ? "New"
          : null;

  // Related rails can hand us the full PDP gallery, which includes videos.
  const cardPhotos = photosOnly(product.images);
  const primaryImage = cardPhotos[0];
  const secondImage = cardPhotos[1];
  const hasSecond = hasOliveImage(secondImage?.url);

  // Escape and clicks outside put the sheet away; Escape hands focus back to
  // the bar that opened it.
  useEffect(() => {
    if (!sheetOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSheetOpen(false);
      triggerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (cardRef.current?.contains(event.target as Node)) return;
      setSheetOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [sheetOpen]);

  useEffect(() => {
    if (!sheetOpen) return;
    sheetRef.current
      ?.querySelector<HTMLButtonElement>("button:not([disabled])")
      ?.focus();
  }, [sheetOpen]);

  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => setAnnouncement(""), ANNOUNCE_MS);
    return () => clearTimeout(timer);
  }, [announcement]);

  useEffect(() => {
    return () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    };
  }, []);

  // One reduced-motion-free frame at `false` first, same as `OliveToast`'s
  // own replay idiom, so a repeat add restarts the animation instead of a
  // no-op re-set of an already-`true` value.
  const commit = () => {
    setCommitted(false);
    requestAnimationFrame(() => setCommitted(true));
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => setCommitted(false), COMMIT_MS);
  };

  const announce = (label: string) => {
    setAnnouncement(`${label} added to bag`);
    window.dispatchEvent(
      new CustomEvent<OliveCartAddedDetail>(OLIVE_CART_ADDED_EVENT, {
        detail: { name: label },
      }),
    );
  };

  const addSimple = () => {
    if (!cartEnabled || blocked) return;
    addItem({
      productId: product.id,
      productSlug: product.slug,
      variantId: null,
      productName: product.name,
      variantName: null,
      price: status.displayPrice,
      compareAtPrice: status.isOnSale ? status.displayCompareAtPrice : null,
      imageUrl: primaryImage?.url ?? null,
      sku: null,
      maxInventory: status.maxInventory,
    });
    commit();
    announce(product.name);
  };

  const addVariant = (choice: VariantChoice) => {
    if (!cartEnabled || blocked) return;
    const { variant } = choice;
    const price = resolveVariantPrice(variant.price, product.price);
    const compareAt = resolveVariantCompareAtPrice(
      variant.price,
      variant.compareAtPrice,
      product.compareAtPrice,
    );
    addItem({
      productId: product.id,
      productSlug: product.slug,
      variantId: variant.id,
      productName: product.name,
      variantName: variant.name,
      price,
      compareAtPrice: compareAt && compareAt > price ? compareAt : null,
      imageUrl: variant.imageUrl ?? primaryImage?.url ?? null,
      sku: variant.sku ?? null,
      maxInventory: trackStock ? variant.inventoryQty : undefined,
    });
    setSheetOpen(false);
    triggerRef.current?.focus();
    commit();
    announce(`${product.name} — ${choice.value}`);
  };

  return (
    <div
      className={cn("h-full", index !== undefined && "olive-reveal-item")}
      style={
        index !== undefined
          ? ({ "--i": Math.min(index, 8) } as CSSProperties)
          : undefined
      }
    >
      <article
        ref={cardRef}
        className={cn("olive-product-card", className)}
        data-hovered={hovered && hasSecond ? "true" : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={(event) => {
          // React's onBlur is focusout, so it fires while focus is still
          // moving between the card's own children — only drop the hover
          // state when focus has actually left the card.
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setHovered(false);
          }
        }}
      >
        {/* Photograph — 3:4 on a sand bed, the shape of a garment shot */}
        <div className="olive-product-card-media">
          {hasOliveImage(primaryImage?.url) ? (
            <>
              <Image
                src={primaryImage?.url ?? ""}
                alt=""
                fill
                priority={priority}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover"
              />
              {/* Second photograph: a plain cross-fade on hover
                  (`.olive-product-card-alt`, reduced-motion safe in CSS). */}
              {hasSecond ? (
                <Image
                  src={secondImage?.url ?? ""}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="olive-product-card-alt object-cover"
                />
              ) : null}
            </>
          ) : (
            <OliveImageFallback className="absolute inset-0" />
          )}

          {/* The image repeats the name link's destination, so it stays out of
              the accessibility tree rather than announcing the same link twice. */}
          <Link
            href={href}
            aria-hidden="true"
            tabIndex={-1}
            className="absolute inset-0 z-[2]"
          />

          {cornerTab ? (
            <span className="olive-product-card-tag">{cornerTab}</span>
          ) : null}

          {/* Catalog mode (B6.11): no quick-add when `cart` is off */}
          {showQuickAdd && cartEnabled ? (
            <div
              className="olive-quick-add"
              data-open={sheetOpen ? "true" : undefined}
            >
              <QuickAdd
                blockedLabel={
                  status.comingSoon
                    ? "Coming soon"
                    : status.isOutOfStock
                      ? "Sold out"
                      : null
                }
                choices={choices}
                href={href}
                productName={product.name}
                sheetId={sheetId}
                sheetOpen={sheetOpen}
                sheetRef={sheetRef}
                trackStock={trackStock}
                triggerRef={triggerRef}
                committed={committed}
                onAddSimple={addSimple}
                onAddVariant={addVariant}
                onToggleSheet={() => setSheetOpen((open) => !open)}
                hasVariants={variants.length > 0 || hasOptions}
              />
            </div>
          ) : null}
        </div>

        {/* Name, price, real colours */}
        <div className="flex flex-1 flex-col gap-1.5 pt-3.5">
          <NameHeading className="olive-card-title olive-product-card-name">
            <Link href={href}>{product.name}</Link>
          </NameHeading>

          <OlivePrice
            price={status.displayPrice}
            compareAtPrice={
              status.isOnSale ? status.displayCompareAtPrice : null
            }
            from={status.variablePricing}
          />

          {visibleSwatches.length > 0 ? (
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="sr-only">Colours:</span>
              {visibleSwatches.map((swatch) => (
                <OliveChip
                  key={swatch.value}
                  color={
                    swatchOverrideFor(swatchOverrides, swatch.label) ??
                    swatch.label
                  }
                  label={swatch.label}
                  size={14}
                  state={swatch.soldOut ? "sold-out" : undefined}
                />
              ))}
              {hiddenSwatches > 0 ? (
                <span className="olive-caption">+{hiddenSwatches}</span>
              ) : null}
            </span>
          ) : null}
        </div>

        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </span>
      </article>
    </div>
  );
}

type QuickAddProps = {
  blockedLabel: string | null;
  choices: VariantChoice[] | null;
  href: string;
  productName: string;
  sheetId: string;
  sheetOpen: boolean;
  sheetRef: React.RefObject<HTMLDivElement | null>;
  trackStock: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  /** The press-commit, true for one ~460ms cycle right after a successful add. */
  committed: boolean;
  onAddSimple: () => void;
  onAddVariant: (choice: VariantChoice) => void;
  onToggleSheet: () => void;
  hasVariants: boolean;
};

/**
 * The bar, and the sheet it can open. Split out so the card body reads as a
 * layout and this reads as the one decision it makes.
 */
function QuickAdd({
  blockedLabel,
  choices,
  href,
  productName,
  sheetId,
  sheetOpen,
  sheetRef,
  trackStock,
  triggerRef,
  committed,
  onAddSimple,
  onAddVariant,
  onToggleSheet,
  hasVariants,
}: QuickAddProps) {
  if (blockedLabel) {
    return (
      <button type="button" disabled className="olive-quick-add-bar">
        {blockedLabel}
      </button>
    );
  }

  if (!hasVariants) {
    return (
      <button
        type="button"
        onClick={onAddSimple}
        aria-label={`Add ${productName} to bag`}
        data-commit={committed ? "true" : undefined}
        className="olive-quick-add-bar"
      >
        Add to bag
      </button>
    );
  }

  // Two option dimensions: the honest answer is the product page.
  if (!choices) {
    return (
      <Link
        href={href}
        aria-label={`Choose options for ${productName}`}
        className="olive-quick-add-bar"
      >
        Choose options
      </Link>
    );
  }

  return (
    <>
      {sheetOpen ? (
        <div
          ref={sheetRef}
          id={sheetId}
          role="group"
          aria-label={`Options for ${productName}`}
          className="olive-quick-add-sheet"
        >
          {choices.map((choice) => {
            const soldOut = trackStock && choice.variant.inventoryQty <= 0;
            return (
              <button
                key={choice.variant.id}
                type="button"
                disabled={soldOut}
                onClick={() => onAddVariant(choice)}
                className="olive-quick-add-option"
              >
                {choice.value}
                {soldOut ? <span className="sr-only"> — sold out</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        onClick={onToggleSheet}
        aria-expanded={sheetOpen}
        aria-controls={sheetId}
        aria-label={`Choose options for ${productName}`}
        data-commit={committed ? "true" : undefined}
        className="olive-quick-add-bar"
      >
        Choose options
      </button>
    </>
  );
}

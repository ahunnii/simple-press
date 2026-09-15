"use client";

import type { CSSProperties } from "react";
import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { OliveCartAddedDetail } from "../layout/olive-toast";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { cn } from "~/lib/utils";
import {
  resolveVariantCompareAtPrice,
  resolveVariantPrice,
} from "~/lib/variant-price";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { useCart } from "~/providers/cart-context";

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
/** Colour chips on a card before the row collapses to "+N". */
const MAX_CARD_SWATCHES = 6;
/** How long the sr-only confirmation stays in the live region. */
const ANNOUNCE_MS = 2400;

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
 * OliveProductCard — the swatch card, and the template's thesis.
 *
 * A photograph on card stock, the product's real colours as chips beneath it,
 * the price, and one pill that puts it in the bag. It refuses the flat white
 * grid with a black button: the card rests on paper and warms to white as you
 * approach it (`olive-card-lift`), the second photograph cross-fades in on
 * hover, and a corner tab states stock in words rather than in colour alone.
 *
 * Quick-add is honest about what it can do. No variants: it adds. One option
 * dimension: a small sheet opens inside the card and adding the chosen row is
 * still one gesture. Two dimensions (size AND colour): it sends you to the
 * product page, because guessing which combination you meant is worse than
 * asking. Coming-soon and sold-out disable it outright — the same rule the
 * checkout enforces server-side.
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
  const reducedMotion = useReducedMotion();

  const [hovered, setHovered] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const cardRef = useRef<HTMLElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const sheetId = useId();

  const variants = product.variants ?? [];
  const status = checkProductStatus({
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
  const visibleSwatches = swatches.slice(0, MAX_CARD_SWATCHES);
  const hiddenSwatches = swatches.length - visibleSwatches.length;
  const choices = singleDimensionChoices(variants);

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

  const primaryImage = product.images[0];
  const secondImage = product.images[1];
  const showSecond = hovered && hasOliveImage(secondImage?.url);
  const fadeStyle = (visible: boolean): CSSProperties => ({
    opacity: visible ? 1 : 0,
    transition: reducedMotion ? undefined : "opacity 300ms var(--olive-ease)",
  });

  // Escape and clicks outside put the sheet away; Escape hands focus back to
  // the pill that opened it.
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

  const announce = (label: string) => {
    setAnnouncement(`${label} added to bag`);
    window.dispatchEvent(
      new CustomEvent<OliveCartAddedDetail>(OLIVE_CART_ADDED_EVENT, {
        detail: { name: label },
      }),
    );
  };

  const addSimple = () => {
    if (blocked) return;
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
    announce(product.name);
  };

  const addVariant = (choice: VariantChoice) => {
    if (blocked) return;
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
        className={cn(
          "olive-card olive-card-paper olive-card-lift relative flex h-full flex-col overflow-hidden",
          className,
        )}
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
        {/* Photograph — 3:4, the shape of a garment shot */}
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "3 / 4" }}
        >
          {hasOliveImage(primaryImage?.url) ? (
            <>
              <Image
                src={primaryImage?.url ?? ""}
                alt=""
                fill
                priority={priority}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
                className="object-cover"
                style={fadeStyle(!showSecond)}
              />
              {hasOliveImage(secondImage?.url) ? (
                <Image
                  src={secondImage?.url ?? ""}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
                  className="object-cover"
                  style={fadeStyle(showSecond)}
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
            className="absolute inset-0"
          />

          {cornerTab ? (
            <span
              className="olive-label pointer-events-none absolute top-2.5 left-2.5 px-2 py-1"
              style={{
                backgroundColor: "var(--olive-white)",
                border: "1px solid var(--olive-hairline)",
                borderRadius: "var(--olive-card-radius)",
                color: "var(--olive-ink)",
              }}
            >
              {cornerTab}
            </span>
          ) : null}
        </div>

        {/* Specimen line: name, real colours, price, one pill */}
        <div className="flex flex-1 flex-col gap-2 p-3">
          <NameHeading
            style={{
              fontFamily: "var(--olive-font-display)",
              fontWeight: 400,
              fontSize: "0.9375rem",
              lineHeight: 1.3,
              color: "var(--olive-ink)",
            }}
          >
            <Link href={href} className="hover:underline">
              {product.name}
            </Link>
          </NameHeading>

          {visibleSwatches.length > 0 ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="sr-only">Colours:</span>
              {visibleSwatches.map((swatch) => (
                <OliveChip
                  key={swatch.value}
                  color={swatch.label}
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

          <OlivePrice
            price={status.displayPrice}
            compareAtPrice={
              status.isOnSale ? status.displayCompareAtPrice : null
            }
            from={status.variablePricing}
            className="mt-auto"
          />

          {showQuickAdd ? (
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
              onAddSimple={addSimple}
              onAddVariant={addVariant}
              onToggleSheet={() => setSheetOpen((open) => !open)}
              hasVariants={variants.length > 0}
            />
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
  onAddSimple: () => void;
  onAddVariant: (choice: VariantChoice) => void;
  onToggleSheet: () => void;
  hasVariants: boolean;
};

/**
 * The pill, and the sheet it can open. Split out so the card body reads as a
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
  onAddSimple,
  onAddVariant,
  onToggleSheet,
  hasVariants,
}: QuickAddProps) {
  if (blockedLabel) {
    return (
      <button
        type="button"
        disabled
        className="olive-btn olive-btn-secondary olive-btn-sm mt-1 w-full"
      >
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
        className="olive-btn olive-btn-secondary olive-btn-sm mt-1 w-full"
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
        className="olive-btn olive-btn-secondary olive-btn-sm mt-1 w-full"
      >
        Choose options
      </Link>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggleSheet}
        aria-expanded={sheetOpen}
        aria-controls={sheetId}
        aria-label={`Choose options for ${productName}`}
        className="olive-btn olive-btn-secondary olive-btn-sm mt-1 w-full"
      >
        Choose options
      </button>

      {sheetOpen ? (
        <div
          ref={sheetRef}
          id={sheetId}
          role="group"
          aria-label={`Options for ${productName}`}
          className="absolute inset-x-2 bottom-2 z-20 flex max-h-[70%] flex-wrap gap-2 overflow-y-auto p-3"
          style={{
            backgroundColor: "var(--olive-white)",
            border: "1px solid var(--olive-hairline-strong)",
            borderRadius: "var(--olive-card-radius)",
            boxShadow: "var(--olive-shadow)",
          }}
        >
          {choices.map((choice) => {
            const soldOut = trackStock && choice.variant.inventoryQty <= 0;
            return (
              <button
                key={choice.variant.id}
                type="button"
                disabled={soldOut}
                onClick={() => onAddVariant(choice)}
                className="olive-btn olive-btn-secondary olive-btn-sm"
              >
                {choice.value}
                {soldOut ? <span className="sr-only"> — sold out</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

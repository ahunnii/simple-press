"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { GloveAddOnCopy } from "./glove-addon-picker";
import type { GloveAddOn } from "./glove-addons";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { buildVariantCartItem } from "~/lib/products/build-variant-cart-item";
import { cn } from "~/lib/utils";
import { resolveVariantPrice } from "~/lib/variant-price";
import { useProduct } from "~/hooks/use-product";
import { cartLineKey, useCart } from "~/providers/cart-context";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";
import { SubscribePanel } from "~/app/(storefront)/_components/product/subscribe-panel";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

import { gloveButtonClass, GlovePrice } from "../shared";
import { GloveAddOnPicker } from "./glove-addon-picker";
import { variantOptionGroups } from "./glove-color";
import { gloveStepPlan, orderGloveGroups } from "./glove-steps";
import { gloveConfiguredTotal } from "./glove-total";
import { GloveVariantSelector } from "./glove-variant-selector";

type Product = DefaultProductPageTemplateProps["product"];

/** Quantity ceiling for stock that isn't counted (mirrors use-product). */
const UNTRACKED_MAX = 100;

/**
 * Buy-bar observer root margin: grows the viewport downward far past any
 * page, so only "scrolled above the viewport" reads as not intersecting.
 */
const BELOW_VIEWPORT_MARGIN = "0px 0px 1000000px 0px";

export type GloveBuyBoxCopy = {
  addToCart: string;
  unavailable: string;
  notify: string;
  comingSoonHeading: string;
  comingSoonBody: string;
  addOns: GloveAddOnCopy;
};

type Props = {
  product: Product;
  /** Made-to-order product: numbered option steps + add-on picker. */
  numbered: boolean;
  /** Notice, short description and attribute table (server-rendered). */
  intro: ReactNode;
  /** Chains/charms for the picker; null hides it. */
  addOns: { chains: GloveAddOn[]; charms: GloveAddOn[] } | null;
  addOnSectionAttrs?: Record<string, string>;
  categories: { name: string; slug: string }[];
  /** Link category names to their collection pages (collections flag on). */
  linkCategories: boolean;
  /**
   * `cart` feature flag (B6.11 catalog mode). Off: no Add to Cart, qty
   * stepper or add-on picker; price, variants, wishlist and notify-me stay.
   */
  cartEnabled: boolean;
  copy: GloveBuyBoxCopy;
};

/**
 * The PDP buy column from the price down: price (range-aware; once a chain or
 * charm is chosen it becomes the configured total with a muted "Glove $X"
 * sub-line, the same number the add-on picker totals), the server-rendered
 * intro, the grouped option selector, the add-on picker, the
 * qty stepper + full-width ADD TO CART, then wishlist beside one quiet
 * category/SKU line.
 *
 * Built on the shared `useProduct` hook (selection, quantity, the plain
 * add-to-cart path) and `buildVariantCartItem` for variants. Coming-soon is
 * checked first and shows no purchase UI at all. The button is only ever
 * disabled with a visible reason (aria-disabled + text), never silently.
 */
export function GloveBuyBox({
  product,
  numbered,
  intro,
  addOns,
  addOnSectionAttrs,
  categories,
  linkCategories,
  cartEnabled,
  copy,
}: Props) {
  const {
    selectedVariantId,
    setSelectedVariantId,
    selectedVariant,
    quantity,
    setQuantity,
    displayPrice,
    displayCompareAtPrice,
    isOnSale,
    additionalFields,
    displayTrustBadges,
    inStock,
    cartQuantity,
    remainingStock,
    handleAddToCart,
  } = useProduct(product);
  const { addItem, setIsOpen } = useCart();
  const { setVariantImageUrl } = useVariantImage();

  const [chainId, setChainId] = useState<string | null>(null);
  const [charmIds, setCharmIds] = useState<string[]>([]);
  const [announce, setAnnounce] = useState("");

  const hasVariants = product.variants.length > 0;
  const comingSoon = additionalFields?.comingSoon === true;

  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const configRef = useRef<HTMLDivElement | null>(null);
  // Mobile buy bar: shown once the main Add to Cart has scrolled up out of
  // view. The sentinel is a callback ref held in state, so the observer
  // follows the node even if the purchase row remounts.
  const [sentinel, setSentinel] = useState<HTMLSpanElement | null>(null);
  const [pastAddButton, setPastAddButton] = useState(false);

  // Contiguous Easy Guide numbers across the option rows and the add-on rows.
  const stepPlan = useMemo(
    () =>
      gloveStepPlan(
        orderGloveGroups(variantOptionGroups(product.variants), numbered).map(
          (group) => group.key,
        ),
        numbered,
      ),
    [product.variants, numbered],
  );

  useEffect(() => {
    setVariantImageUrl(selectedVariant?.imageUrl ?? null);
  }, [selectedVariant?.imageUrl, setVariantImageUrl]);

  // Range across variants (e.g. Gift Card $10.00 – $250.00).
  const range = useMemo(() => {
    if (!hasVariants) return null;
    const prices = product.variants.map((v) =>
      resolveVariantPrice(v.price, product.price),
    );
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return max > min ? { min, max } : null;
  }, [hasVariants, product.variants, product.price]);

  // Variant ceiling (olive rule: untracked / backorderable → generous cap).
  const variantMax = !selectedVariant
    ? 0
    : !product.trackInventory
      ? UNTRACKED_MAX
      : selectedVariant.inventoryQty > 0
        ? selectedVariant.inventoryQty
        : product.allowBackorders
          ? UNTRACKED_MAX
          : 0;
  const maxQty = hasVariants
    ? Math.max(0, variantMax - cartQuantity)
    : remainingStock;

  const productSoldOut = hasVariants
    ? product.trackInventory &&
      !product.allowBackorders &&
      product.variants.every((v) => v.inventoryQty <= 0)
    : !inStock;
  const variantSoldOut =
    hasVariants &&
    (!selectedVariant ||
      (product.trackInventory &&
        !product.allowBackorders &&
        selectedVariant.inventoryQty <= 0));
  const cartHoldsAll = !productSoldOut && !variantSoldOut && maxQty <= 0;

  const blockedReason = variantSoldOut
    ? copy.unavailable
    : cartEnabled && cartHoldsAll
      ? "You already have every available one in your cart."
      : null;

  const onAdd = () => {
    if (!cartEnabled || blockedReason || productSoldOut) return;
    const qty = Math.min(quantity, Math.max(1, maxQty));
    let gloveKey: string;
    if (hasVariants && selectedVariant) {
      addItem(buildVariantCartItem(product, selectedVariant, variantMax), qty);
      gloveKey = cartLineKey(product.id, selectedVariant.id);
      setQuantity(1);
    } else {
      handleAddToCart();
      gloveKey = cartLineKey(product.id, selectedVariantId);
    }
    if (addOns) {
      // Tied to the glove line so the cart nests them under it (and the same
      // chain picked for two gloves stays two lines).
      const chain = addOns.chains.find((c) => c.id === chainId);
      if (chain) addItem({ ...chain.cartItem, addOnFor: gloveKey }, qty);
      for (const charm of addOns.charms.filter((c) =>
        charmIds.includes(c.id),
      )) {
        addItem({ ...charm.cartItem, addOnFor: gloveKey }, qty);
      }
      setChainId(null);
      setCharmIds([]);
    }
    setIsOpen(true);
    // The drawer is the confirmation; the platform's "added to cart" toast
    // (one per addItem, so the add-ons too) would sit on its CHECKOUT button.
    // The live region below still announces the add to screen readers.
    // Deferred a tick: sonner drops a dismiss that lands in the same batch as
    // the toast it targets.
    window.setTimeout(() => toast.dismiss(), 0);
    setAnnounce(`${product.name} added to cart`);
  };

  const sku = (selectedVariant?.sku ?? product.sku)?.trim() ?? "";
  const showPicker =
    cartEnabled &&
    addOns !== null &&
    (addOns.chains.length > 0 || addOns.charms.length > 0) &&
    !comingSoon &&
    !productSoldOut;
  const showAddButton = cartEnabled && !comingSoon && !productSoldOut;

  // One price: with a chain or charm chosen, the price spots show the
  // configured total (the picker's number, from the shared helper) with the
  // glove-only price as a muted sub-line. Silent here: the picker's total is
  // the one polite live region. While a variant range is still open (nothing
  // chosen) the glove has no single price, so the range stays and the add-ons
  // are named on their own.
  const gloveAmount = displayPrice * quantity;
  const config = gloveConfiguredTotal({
    gloveAmount,
    quantity,
    chains: addOns?.chains ?? [],
    charms: addOns?.charms ?? [],
    chainId,
    charmIds,
  });
  const configured = showPicker && config.hasAddOns;
  const rangeOpen = range !== null && !selectedVariant;
  const gloveSubLine = `${copy.addOns.gloveLine} ${formatPrice(gloveAmount)}`;
  const addOnsSubLine = `+ ${formatPrice(config.addOnsAmount)} add-ons`;

  // One IntersectionObserver on a 1px sentinel at the bottom of the
  // purchase row. The root's bottom margin is effectively unbounded, so the
  // sentinel counts as "intersecting" anywhere from the viewport top down to
  // the end of the page: it stops intersecting exactly when the row has
  // scrolled above the viewport, and a jump from below to above (End key,
  // anchor, scroll restoration) still flips that state, so it always
  // notifies. Only the newest entry is read; callbacks can batch several.
  useEffect(() => {
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        setPastAddButton(
          !entry.isIntersecting && entry.boundingClientRect.top < 0,
        );
      },
      { rootMargin: BELOW_VIEWPORT_MARGIN },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      setPastAddButton(false);
    };
  }, [sentinel]);

  // Leave room under the footer for the fixed bar while it is up (below md).
  // The bar is taller by one sub-line while it shows a configured total.
  const barRoom = configured ? "5.5rem" : "4.5rem";
  useEffect(() => {
    if (!pastAddButton) return;
    const small = window.matchMedia("(max-width: 767px)");
    const previous = document.body.style.paddingBottom;
    const apply = () => {
      document.body.style.paddingBottom = small.matches
        ? `calc(${barRoom} + env(safe-area-inset-bottom))`
        : previous;
    };
    apply();
    small.addEventListener("change", apply);
    return () => {
      small.removeEventListener("change", apply);
      document.body.style.paddingBottom = previous;
    };
  }, [pastAddButton, barRoom]);

  // Same add path as the main button. A step still open (no variant chosen)
  // takes the shopper to it; a blocked add shows the main button's reason.
  const onBarAdd = () => {
    if (hasVariants && !selectedVariant) {
      const target = configRef.current?.querySelector<HTMLElement>(
        '[role="radio"][tabindex="0"], [role="radio"], select',
      );
      (target ?? configRef.current)?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
      target?.focus({ preventScroll: true });
      return;
    }
    if (blockedReason) {
      addButtonRef.current?.scrollIntoView({ block: "center" });
      return;
    }
    onAdd();
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="m-0">
        {range ? (
          <GlovePrice price={range.min} maxPrice={range.max} size="lg" />
        ) : configured ? (
          <ConfiguredPrice
            total={config.total}
            totalLabel={copy.addOns.totalLine}
            subLine={gloveSubLine}
            size="lg"
          />
        ) : (
          <GlovePrice
            price={displayPrice}
            compareAtPrice={isOnSale ? displayCompareAtPrice : null}
            size="lg"
          />
        )}
        {range && configured && rangeOpen ? (
          <PriceSubLine size="lg">{addOnsSubLine}</PriceSubLine>
        ) : null}
      </p>

      {intro}

      {comingSoon ? (
        <div className="rounded-[var(--glove-radius-card)] border border-[var(--glove-mist-line)] bg-[var(--glove-mist)] px-5 py-4">
          <p
            className="glove-display text-[16px] font-medium text-[var(--glove-primary)]"
            {...fieldAttr("glove.product.coming-soon-heading")}
          >
            {copy.comingSoonHeading}
          </p>
          {copy.comingSoonBody ? (
            <p
              className="mt-1 text-[14px] text-[var(--glove-text)]"
              {...fieldAttr("glove.product.coming-soon-body")}
            >
              {copy.comingSoonBody}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          {hasVariants ? (
            <div ref={configRef}>
              <GloveVariantSelector
                variants={product.variants}
                trackInventory={product.trackInventory}
                allowBackorders={product.allowBackorders}
                selectedId={selectedVariantId}
                onSelect={(id) => {
                  setSelectedVariantId(id);
                  setQuantity(1);
                }}
                numbered={numbered}
                steps={stepPlan.options}
              />
            </div>
          ) : null}

          {showPicker ? (
            <GloveAddOnPicker
              chains={addOns.chains}
              charms={addOns.charms}
              chainId={chainId}
              onChainChange={setChainId}
              charmIds={charmIds}
              onCharmsChange={setCharmIds}
              gloveAmount={displayPrice * quantity}
              quantity={quantity}
              copy={copy.addOns}
              sectionAttrs={addOnSectionAttrs}
              firstStep={stepPlan.next}
            />
          ) : null}

          {productSoldOut ? (
            <SoldOut
              productId={product.id}
              variantId={selectedVariant?.id ?? null}
              notify={copy.notify}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {range && !rangeOpen ? (
                <p className="m-0">
                  {configured ? (
                    <ConfiguredPrice
                      total={config.total}
                      totalLabel={`Selected option, ${copy.addOns.totalLine}`}
                      subLine={gloveSubLine}
                      size="md"
                    />
                  ) : (
                    <>
                      <span className="sr-only">Selected option price </span>
                      <GlovePrice
                        price={displayPrice}
                        compareAtPrice={isOnSale ? displayCompareAtPrice : null}
                        size="md"
                      />
                    </>
                  )}
                </p>
              ) : null}
              {cartEnabled ? (
                <div className="relative flex items-stretch gap-3">
                  <QtyStepper
                    value={quantity}
                    max={Math.max(1, maxQty)}
                    disabled={blockedReason !== null}
                    onChange={setQuantity}
                  />
                  <button
                    ref={addButtonRef}
                    type="button"
                    onClick={onAdd}
                    aria-disabled={blockedReason ? true : undefined}
                    aria-describedby={
                      blockedReason ? "glove-atc-reason" : undefined
                    }
                    className={gloveButtonClass({
                      variant: "woo",
                      size: "lg",
                      fullWidth: true,
                      className: "flex-1",
                    })}
                    {...fieldAttr("glove.product.add-to-cart-label")}
                  >
                    {copy.addToCart}
                  </button>
                  <span
                    ref={setSentinel}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
                  />
                </div>
              ) : null}
              {blockedReason ? (
                <p
                  id="glove-atc-reason"
                  className="glove-error m-0"
                  {...(variantSoldOut
                    ? fieldAttr("glove.product.unavailable-text")
                    : {})}
                >
                  {blockedReason}
                </p>
              ) : null}
              {variantSoldOut && selectedVariant ? (
                <NotifyMeForm
                  productId={product.id}
                  variantId={selectedVariant.id}
                  message={copy.notify}
                  messageClassName="text-[14px] text-[var(--glove-text)]"
                  inputClassName="glove-input"
                  buttonClassName={gloveButtonClass({ variant: "wooOutline" })}
                />
              ) : null}
              {cartEnabled ? (
                <p role="status" aria-live="polite" className="sr-only">
                  {announce}
                </p>
              ) : null}
            </div>
          )}
        </>
      )}

      <SubscribePanel
        product={product}
        selectedVariantId={selectedVariantId}
        quantity={quantity}
        available={!comingSoon && !productSoldOut && !variantSoldOut}
      />

      {displayTrustBadges.length > 0 ? (
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
          {displayTrustBadges.map((badge, i) => (
            <li
              key={`${badge.label}-${i}`}
              className="flex items-center gap-2 rounded-[var(--glove-radius-card)] bg-[var(--glove-mist)] px-3 py-2 text-[13px] text-[var(--glove-ink)]"
            >
              <badge.Icon
                className="size-4 shrink-0 text-[var(--glove-primary)]"
                aria-hidden="true"
              />
              {badge.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--glove-line)] pb-5 empty:hidden">
        <WishlistButton
          item={{
            productId: product.id,
            name: product.name,
            slug: product.slug,
            price: displayPrice,
            imageUrl: product.images[0]?.url ?? null,
          }}
          className="static size-11 rounded-[var(--glove-radius-btn)] border border-[var(--glove-line)] bg-[var(--glove-paper)] text-[var(--glove-primary)] shadow-none backdrop-blur-none hover:scale-100 hover:border-[var(--glove-primary)]"
          iconClassName="size-5"
        />
        {categories.length > 0 || sku ? (
          <p className="m-0 min-w-0 text-[13px] text-[var(--glove-muted)]">
            {categories.length > 0 ? (
              <>
                {categories.length === 1 ? "Category: " : "Categories: "}
                {categories.map((c, i) => (
                  <span key={c.slug}>
                    {i > 0 ? ", " : null}
                    {linkCategories ? (
                      <Link
                        href={`/collections/${c.slug}`}
                        className="underline-offset-2 transition-colors hover:text-[var(--glove-primary)] hover:underline"
                      >
                        {c.name}
                      </Link>
                    ) : (
                      c.name
                    )}
                  </span>
                ))}
              </>
            ) : null}
            {categories.length > 0 && sku ? (
              <span aria-hidden="true"> · </span>
            ) : null}
            {sku ? <span>SKU {sku}</span> : null}
          </p>
        ) : null}
      </div>

      {showAddButton ? (
        <div
          aria-hidden={!pastAddButton}
          inert={!pastAddButton}
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-[var(--glove-line)] bg-[var(--glove-paper)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-6px_18px_rgba(58,15,74,0.08)] md:hidden",
            "transition-[transform,opacity,visibility] duration-200 ease-[var(--glove-ease)] motion-reduce:transition-none",
            pastAddButton
              ? "translate-y-0 opacity-100"
              : "invisible translate-y-full opacity-0",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="glove-display m-0 truncate text-[13px] leading-tight font-medium text-[var(--glove-ink)]">
              {product.name}
            </p>
            <p className="m-0 mt-0.5">
              {configured && !rangeOpen ? (
                <ConfiguredPrice
                  total={config.total}
                  totalLabel={copy.addOns.totalLine}
                  subLine={gloveSubLine}
                  size="sm"
                />
              ) : (
                <>
                  <GlovePrice
                    price={displayPrice}
                    compareAtPrice={isOnSale ? displayCompareAtPrice : null}
                    size="sm"
                  />
                  {configured ? (
                    <PriceSubLine size="sm">{addOnsSubLine}</PriceSubLine>
                  ) : null}
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onBarAdd}
            aria-disabled={blockedReason ? true : undefined}
            className={gloveButtonClass({
              variant: "woo",
              size: "md",
              className: "shrink-0",
            })}
          >
            {copy.addToCart}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The configured total in a price spot, with the glove-only price as a muted
 * sub-line. Not a live region (the add-on picker announces the total).
 */
function ConfiguredPrice({
  total,
  totalLabel,
  subLine,
  size,
}: {
  total: number;
  /** Read by screen readers ahead of the amount ("Total"). */
  totalLabel: string;
  subLine: string;
  size: "sm" | "md" | "lg";
}) {
  return (
    <>
      <span className="sr-only">{totalLabel} </span>
      <GlovePrice price={total} size={size} />
      <PriceSubLine size={size}>{subLine}</PriceSubLine>
    </>
  );
}

function PriceSubLine({
  size,
  children,
}: {
  size: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "glove-body mt-0.5 block leading-snug font-normal text-[var(--glove-muted)]",
        size === "sm" ? "text-[12px]" : "text-[13px]",
      )}
    >
      {children}
    </span>
  );
}

function SoldOut({
  productId,
  variantId,
  notify,
}: {
  productId: string;
  variantId: string | null;
  notify: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0">
        <span className="glove-sale-badge">Sold out</span>
      </p>
      <NotifyMeForm
        productId={productId}
        variantId={variantId}
        message={notify}
        messageClassName="text-[14px] text-[var(--glove-text)]"
        inputClassName="glove-input"
        buttonClassName={gloveButtonClass({ variant: "wooOutline" })}
      />
    </div>
  );
}

function QtyStepper({
  value,
  max,
  disabled,
  onChange,
}: {
  value: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Quantity"
      className="flex shrink-0 items-center rounded-[var(--glove-radius-btn)] border border-[var(--glove-line)]"
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
        aria-label="Decrease quantity"
        className="inline-flex h-full min-h-11 w-11 items-center justify-center text-[var(--glove-ink)] transition-colors hover:text-[var(--glove-primary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <output
        aria-live="polite"
        className="glove-body w-8 text-center text-[15px] font-bold text-[var(--glove-ink)]"
      >
        {value}
      </output>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        className="inline-flex h-full min-h-11 w-11 items-center justify-center text-[var(--glove-ink)] transition-colors hover:text-[var(--glove-primary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { GloveAddOnCopy } from "./glove-addon-picker";
import type { GloveAddOn } from "./glove-addons";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { buildVariantCartItem } from "~/lib/products/build-variant-cart-item";
import { resolveVariantPrice } from "~/lib/variant-price";
import { useProduct } from "~/hooks/use-product";
import { useCart } from "~/providers/cart-context";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";
import { SubscribePanel } from "~/app/(storefront)/_components/product/subscribe-panel";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

import { gloveButtonClass, GlovePrice, GloveShareRow } from "../shared";
import { GloveAddOnPicker } from "./glove-addon-picker";
import { GloveVariantSelector } from "./glove-variant-selector";

type Product = DefaultProductPageTemplateProps["product"];

/** Quantity ceiling for stock that isn't counted (mirrors use-product). */
const UNTRACKED_MAX = 100;

export type GloveBuyBoxCopy = {
  addToCart: string;
  unavailable: string;
  notify: string;
  comingSoonHeading: string;
  comingSoonBody: string;
  shareLabel: string;
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
  shareUrl: string;
  shareImage?: string;
  copy: GloveBuyBoxCopy;
};

/**
 * The PDP buy column from the price down: price (range-aware), the
 * server-rendered intro, the grouped option selector, the add-on picker, the
 * qty stepper + full-width ADD TO CART, wishlist + share, SKU/categories.
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
  shareUrl,
  shareImage,
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
    : cartHoldsAll
      ? "You already have every available one in your cart."
      : null;

  const onAdd = () => {
    if (blockedReason || productSoldOut) return;
    const qty = Math.min(quantity, Math.max(1, maxQty));
    if (hasVariants && selectedVariant) {
      addItem(buildVariantCartItem(product, selectedVariant, variantMax), qty);
      setQuantity(1);
    } else {
      handleAddToCart();
    }
    if (addOns) {
      const chain = addOns.chains.find((c) => c.id === chainId);
      if (chain) addItem(chain.cartItem, qty);
      for (const charm of addOns.charms.filter((c) =>
        charmIds.includes(c.id),
      )) {
        addItem(charm.cartItem, qty);
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

  const sku = selectedVariant?.sku ?? product.sku;
  const showPicker =
    addOns !== null &&
    (addOns.chains.length > 0 || addOns.charms.length > 0) &&
    !comingSoon &&
    !productSoldOut;

  return (
    <div className="flex flex-col gap-6">
      <p className="m-0">
        {range ? (
          <GlovePrice price={range.min} maxPrice={range.max} size="lg" />
        ) : (
          <GlovePrice
            price={displayPrice}
            compareAtPrice={isOnSale ? displayCompareAtPrice : null}
            size="lg"
          />
        )}
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
            />
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
              {range ? (
                <p className="m-0">
                  <span className="sr-only">Selected option price </span>
                  <GlovePrice
                    price={displayPrice}
                    compareAtPrice={isOnSale ? displayCompareAtPrice : null}
                    size="md"
                  />
                </p>
              ) : null}
              <div className="flex items-stretch gap-3">
                <QtyStepper
                  value={quantity}
                  max={Math.max(1, maxQty)}
                  disabled={blockedReason !== null}
                  onChange={setQuantity}
                />
                <button
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
              </div>
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
              <p role="status" aria-live="polite" className="sr-only">
                {announce}
              </p>
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

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[var(--glove-line)] pb-5">
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
        <GloveShareRow
          url={shareUrl}
          title={product.name}
          image={shareImage}
          label={copy.shareLabel}
        />
      </div>

      {sku || categories.length > 0 ? (
        <dl className="m-0 flex flex-col gap-1.5 text-[14px]">
          {sku ? (
            <div className="flex gap-1.5">
              <dt className="glove-display font-medium text-[var(--glove-ink)]">
                SKU:
              </dt>
              <dd className="m-0 text-[var(--glove-muted)]">{sku}</dd>
            </div>
          ) : null}
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              <dt className="glove-display font-medium text-[var(--glove-ink)]">
                {categories.length === 1 ? "Category:" : "Categories:"}
              </dt>
              <dd className="m-0 text-[var(--glove-muted)]">
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
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
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

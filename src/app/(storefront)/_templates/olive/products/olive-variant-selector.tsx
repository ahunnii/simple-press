"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { RouterOutputs } from "~/trpc/react";
import { buildVariantCartItem } from "~/lib/products/build-variant-cart-item";
import { useCart } from "~/providers/cart-context";
import { useVariantImage } from "~/app/(storefront)/_components/product-page/variant-image-context";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";

import { isColorOptionName, OliveChipRow, OliveStatusBadge } from "../shared";
import { announceOliveCartAdded, OliveBuyRow } from "./olive-buy-row";

type OliveProduct = NonNullable<RouterOutputs["product"]["get"]>;
type OliveVariant = OliveProduct["variants"][number];

/** Quantity ceiling for anything whose stock is not counted. */
const BACKORDER_MAX = 100;
/** At or below this many, the stock hint stops being reassuring and says so. */
const LOW_STOCK = 5;

type Props = {
  product: OliveProduct;
  selectedVariantId: string | null;
  setSelectedVariantId: (variantId: string | null) => void;
};

/** `{ size: "M", colour: "Sage" }`, with the junk dropped. */
function optionsOf(variant: OliveVariant): Record<string, string> {
  const raw: unknown = variant.options;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim().length > 0) {
      out[key] = value.trim();
    }
  }
  return out;
}

/** "colour" → "Colour". The owner named the option; we only fix the case. */
function optionLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * OliveVariantSelector — choosing a shade and a size, in the template's own
 * language.
 *
 * Colours are the one place the swatch book is literal: a row of real colour
 * chips, the chosen one ringed in leaf green. Everything else — size, length,
 * scent — is a row of cut tabs, because those are words, not colours, and a
 * chip for them would be ornament (see the chip discipline in design.md).
 *
 * A sold-out option stays in the row, reachable and marked, rather than
 * vanishing: a shopper who cannot find the colour she wants assumes the shop
 * never made it.
 */
export function OliveVariantSelector({
  product,
  selectedVariantId,
  setSelectedVariantId,
}: Props) {
  const { addItem } = useCart();
  const { setVariantImageUrl } = useVariantImage();
  const [quantity, setQuantity] = useState(1);

  const selected =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    product.variants[0] ??
    null;

  const selectedOptions = selected ? optionsOf(selected) : {};

  const groups = useMemo(() => {
    const found = new Map<string, string[]>();
    for (const variant of product.variants) {
      for (const [key, value] of Object.entries(optionsOf(variant))) {
        const values = found.get(key) ?? [];
        if (!values.includes(value)) values.push(value);
        found.set(key, values);
      }
    }
    return Array.from(found, ([key, values]) => ({ key, values }));
  }, [product.variants]);

  useEffect(() => {
    setVariantImageUrl(selected?.imageUrl ?? null);
  }, [selected?.imageUrl, setVariantImageUrl]);

  const countsStock = product.trackInventory && !product.allowBackorders;
  const variantSoldOut = (variant: OliveVariant) =>
    countsStock && variant.inventoryQty <= 0;

  /** A value is sold out only when every variant carrying it is. */
  const valueSoldOut = (key: string, value: string) => {
    const matching = product.variants.filter(
      (variant) => optionsOf(variant)[key] === value,
    );
    return matching.length > 0 && matching.every(variantSoldOut);
  };

  /**
   * Keep every other chosen option where it is; when that combination does not
   * exist (this colour was never cut in that size) fall back to the first
   * available variant carrying the value the shopper just picked, rather than
   * ignoring the click.
   */
  const chooseValue = (key: string, value: string) => {
    const wanted = { ...selectedOptions, [key]: value };
    const exact = product.variants.find((variant) => {
      const options = optionsOf(variant);
      return Object.entries(wanted).every(([k, v]) => options[k] === v);
    });
    const carrying = product.variants.filter(
      (variant) => optionsOf(variant)[key] === value,
    );
    const next =
      exact ??
      carrying.find((variant) => !variantSoldOut(variant)) ??
      carrying[0];
    if (!next) return;
    setSelectedVariantId(next.id);
    setQuantity(1);
  };

  const effectiveMax = !product.trackInventory
    ? BACKORDER_MAX
    : (selected?.inventoryQty ?? 0) > 0
      ? (selected?.inventoryQty ?? 0)
      : product.allowBackorders
        ? BACKORDER_MAX
        : 0;

  const soldOut =
    !selected ||
    (product.trackInventory &&
      selected.inventoryQty === 0 &&
      !product.allowBackorders);

  const onAdd = () => {
    if (!selected || soldOut) return;
    addItem(buildVariantCartItem(product, selected, effectiveMax), quantity);
    setQuantity(1);
    announceOliveCartAdded(`${product.name} — ${selected.name}`);
  };

  return (
    <div className="flex flex-col gap-5">
      {groups.length === 0 ? (
        <OliveOptionRow
          label="Option"
          selectedLabel={selected?.name ?? ""}
          items={product.variants.map((variant) => ({
            value: variant.id,
            label: variant.name,
            soldOut: variantSoldOut(variant),
          }))}
          value={selected?.id ?? null}
          onChange={(id) => {
            setSelectedVariantId(id);
            setQuantity(1);
          }}
        />
      ) : (
        groups.map((group) => {
          const label = optionLabel(group.key);
          const value = selectedOptions[group.key] ?? null;

          if (isColorOptionName(group.key)) {
            return (
              <div key={group.key} className="flex flex-col gap-2">
                <p className="flex flex-wrap items-baseline gap-2">
                  <span className="olive-label">{label}</span>
                  {value ? (
                    <span
                      className="text-[0.875rem]"
                      style={{ color: "var(--olive-ink)" }}
                    >
                      {value}
                    </span>
                  ) : null}
                </p>
                <OliveChipRow
                  aria-label={label}
                  size={26}
                  value={value}
                  onChange={(next) => chooseValue(group.key, next)}
                  items={group.values.map((option) => {
                    const out = valueSoldOut(group.key, option);
                    return {
                      value: option,
                      color: option,
                      label: out ? `${option} — sold out` : option,
                      state: out ? ("sold-out" as const) : undefined,
                      disabled: out,
                    };
                  })}
                />
              </div>
            );
          }

          return (
            <OliveOptionRow
              key={group.key}
              label={label}
              selectedLabel={value ?? ""}
              items={group.values.map((option) => ({
                value: option,
                label: option,
                soldOut: valueSoldOut(group.key, option),
              }))}
              value={value}
              onChange={(next) => chooseValue(group.key, next)}
            />
          );
        })
      )}

      {soldOut ? (
        <div className="flex flex-col gap-3">
          <OliveStatusBadge status="sold-out" />
          <NotifyMeForm
            productId={product.id}
            variantId={selected?.id ?? null}
            message="Tell us where to write when this one is back."
            messageClassName="text-[0.8125rem] text-[var(--olive-ink-soft)]"
            inputClassName="olive-input"
            buttonClassName="olive-btn olive-btn-secondary olive-btn-sm"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <OliveBuyRow
            quantity={quantity}
            onQuantityChange={setQuantity}
            max={effectiveMax}
            itemLabel={`${product.name}${selected ? ` — ${selected.name}` : ""}`}
            onAdd={onAdd}
          />
          <OliveVariantStock
            trackInventory={product.trackInventory}
            allowBackorders={product.allowBackorders}
            inventoryQty={selected?.inventoryQty ?? 0}
          />
        </div>
      )}
    </div>
  );
}

/** The stock line for the chosen variant — a chip only when the state earns one. */
function OliveVariantStock({
  trackInventory,
  allowBackorders,
  inventoryQty,
}: {
  trackInventory: boolean;
  allowBackorders: boolean;
  inventoryQty: number;
}) {
  if (!trackInventory) return null;

  if (inventoryQty <= 0 && allowBackorders) {
    return (
      <OliveStatusBadge
        status="pre-order"
        label="Pre-order — ships when available"
      />
    );
  }

  if (inventoryQty > 0 && inventoryQty <= LOW_STOCK) {
    return (
      <OliveStatusBadge status="low" label={`Only ${inventoryQty} left`} />
    );
  }

  if (inventoryQty > 0) {
    return <p className="olive-caption">{inventoryQty} available</p>;
  }

  return null;
}

type OliveOptionItem = { value: string; label: string; soldOut: boolean };

/**
 * A row of cut tabs — the non-colour options.
 *
 * A radio group with one tab stop: Arrow keys move and select, Home and End
 * jump to the ends. A sold-out tab keeps its place in the row and says so in
 * its accessible name; it just refuses to be chosen.
 */
function OliveOptionRow({
  label,
  selectedLabel,
  items,
  value,
  onChange,
}: {
  label: string;
  selectedLabel: string;
  items: OliveOptionItem[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);

  if (items.length === 0) return null;

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  );

  const tabs = () =>
    Array.from(
      rowRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ??
        [],
    );

  const moveTo = (index: number) => {
    const item = items[index];
    if (!item) return;
    tabs()[index]?.focus();
    if (!item.soldOut) onChange(item.value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const active = tabs().indexOf(document.activeElement as HTMLButtonElement);
    const from = active >= 0 ? active : activeIndex;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveTo((from + 1) % items.length);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveTo((from - 1 + items.length) % items.length);
        break;
      case "Home":
        event.preventDefault();
        moveTo(0);
        break;
      case "End":
        event.preventDefault();
        moveTo(items.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="flex flex-wrap items-baseline gap-2">
        <span className="olive-label">{label}</span>
        {selectedLabel ? (
          <span
            className="text-[0.875rem]"
            style={{ color: "var(--olive-ink)" }}
          >
            {selectedLabel}
          </span>
        ) : null}
      </p>

      <div
        ref={rowRef}
        role="radiogroup"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex flex-wrap items-center gap-2"
      >
        {items.map((item, index) => {
          const isSelected = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-disabled={item.soldOut || undefined}
              aria-label={item.soldOut ? `${item.label} — sold out` : undefined}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={item.soldOut ? undefined : () => onChange(item.value)}
              className="olive-label inline-flex items-center justify-center"
              style={{
                minWidth: "3rem",
                height: "2.75rem",
                paddingInline: "0.875rem",
                borderRadius: "var(--olive-card-radius)",
                border: `1px solid ${
                  isSelected
                    ? "var(--olive-leaf)"
                    : "var(--olive-hairline-strong)"
                }`,
                boxShadow: isSelected
                  ? "inset 0 0 0 1px var(--olive-leaf)"
                  : undefined,
                backgroundColor: isSelected
                  ? "var(--olive-sage-tint)"
                  : "var(--olive-white)",
                color: isSelected ? "var(--olive-leaf)" : "var(--olive-ink)",
                opacity: item.soldOut ? 0.45 : 1,
                textDecoration: item.soldOut ? "line-through" : undefined,
                cursor: item.soldOut ? "not-allowed" : "pointer",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

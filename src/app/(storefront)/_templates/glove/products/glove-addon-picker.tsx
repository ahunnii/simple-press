"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useId, useRef, useState } from "react";
import Image from "next/image";
import { Ban, Check } from "lucide-react";

import type { GloveAddOn } from "./glove-addons";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";

import { gloveConfiguredTotal } from "./glove-total";
import { GloveOptionLabel } from "./glove-variant-selector";

/** Most charms one glove can carry (design.md Product §3). */
export const GLOVE_MAX_CHARMS = 3;

export type GloveAddOnCopy = {
  heading: string;
  helper: string;
  chainLabel: string;
  noChainLabel: string;
  charmsLabel: string;
  charmsLimit: string;
  gloveLine: string;
  charmLine: string;
  totalLine: string;
};

type Props = {
  chains: GloveAddOn[];
  charms: GloveAddOn[];
  chainId: string | null;
  onChainChange: (id: string | null) => void;
  charmIds: string[];
  onCharmsChange: (ids: string[]) => void;
  /** Glove line amount (unit price × quantity) for the running total. */
  gloveAmount: number;
  quantity: number;
  copy: GloveAddOnCopy;
  sectionAttrs?: Record<string, string>;
  /**
   * Step number of the first row shown here. The buy box passes the number
   * after its last option row; the rows then count up from it (a missing chain
   * or charms list leaves no gap). Default 1.
   */
  firstStep?: number;
};

const NO_CHAIN = "__none__";

/**
 * "Complete your LuvGluv": a Chain row (single choice incl. "No chain") and a
 * Charms row (up to three), each a horizontal track of chips (56px image,
 * name, price). A chosen chip gets the purple ring, a check, and swings from
 * its top edge once (signature 2, `.glove-swing.is-swinging`; settled under
 * reduced motion). Sold-out chips stay visible but can't be chosen. The
 * itemised total under it appears once an add-on is chosen and is the one
 * polite live region for the total (the buy box's price shows the same number
 * from `gloveConfiguredTotal`, silently); the live region itself stays
 * mounted so the first announcement is not lost.
 */
export function GloveAddOnPicker({
  chains,
  charms,
  chainId,
  onChainChange,
  charmIds,
  onCharmsChange,
  gloveAmount,
  quantity,
  copy,
  sectionAttrs,
  firstStep = 1,
}: Props) {
  const headingId = useId();
  const [swingId, setSwingId] = useState<string | null>(null);

  const {
    chain: chosenChain,
    charms: chosenCharms,
    chainAmount,
    charmAmounts,
    total,
    hasAddOns,
  } = gloveConfiguredTotal({
    gloveAmount,
    quantity,
    chains,
    charms,
    chainId,
    charmIds,
  });
  const atLimit = charmIds.length >= GLOVE_MAX_CHARMS;

  const totalParts = [
    `${copy.gloveLine} ${formatPrice(gloveAmount)}`,
    ...(chosenChain ? [`${copy.chainLabel} ${formatPrice(chainAmount)}`] : []),
    ...charmAmounts.map((amount) => `${copy.charmLine} ${formatPrice(amount)}`),
  ];

  const chainStep = chains.length > 0 ? firstStep : null;
  const charmsStep = charms.length > 0 ? firstStep + (chainStep ? 1 : 0) : null;

  const toggleCharm = (id: string) => {
    if (charmIds.includes(id)) {
      onCharmsChange(charmIds.filter((x) => x !== id));
      return;
    }
    if (atLimit) return;
    onCharmsChange([...charmIds, id]);
    setSwingId(id);
  };

  const chooseChain = (id: string) => {
    const next = id === NO_CHAIN ? null : id;
    onChainChange(next);
    if (next) setSwingId(next);
  };

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-[var(--glove-radius-card)] border border-[var(--glove-mist-line)] bg-[var(--glove-mist)] p-4 md:p-5"
      {...sectionAttrs}
    >
      <h2
        id={headingId}
        className="glove-display text-[18px] font-medium text-[var(--glove-ink)]"
        {...fieldAttr("glove.product.addons-heading")}
      >
        {copy.heading}
      </h2>
      {copy.helper ? (
        <p
          className="mt-1 text-[14px] leading-relaxed text-[var(--glove-text)]"
          {...fieldAttr("glove.product.addons-helper")}
        >
          {copy.helper}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-5">
        {chains.length > 0 ? (
          <ChipRow
            mode="single"
            label={copy.chainLabel}
            step={chainStep}
            selectedLabel={chosenChain?.name ?? copy.noChainLabel}
            items={[
              {
                id: NO_CHAIN,
                name: copy.noChainLabel,
                imageUrl: null,
                price: null,
                available: true,
              },
              ...chains.map((c) => ({
                id: c.id,
                name: c.name,
                imageUrl: c.imageUrl,
                price: c.unitPrice,
                available: c.available,
              })),
            ]}
            isSelected={(id) => (id === NO_CHAIN ? !chainId : id === chainId)}
            onPick={chooseChain}
            swingId={swingId}
            onSwingEnd={() => setSwingId(null)}
          />
        ) : null}

        {charms.length > 0 ? (
          <ChipRow
            mode="multi"
            label={copy.charmsLabel}
            step={charmsStep}
            selectedLabel={
              chosenCharms.length > 0
                ? `${chosenCharms.length} of ${GLOVE_MAX_CHARMS}`
                : null
            }
            extra={
              copy.charmsLimit ? (
                <span
                  className="text-[13px] text-[var(--glove-muted)]"
                  {...fieldAttr("glove.product.charms-limit-text")}
                >
                  {copy.charmsLimit}
                </span>
              ) : null
            }
            items={charms.map((c) => ({
              id: c.id,
              name: c.name,
              imageUrl: c.imageUrl,
              price: c.unitPrice,
              available: c.available,
              blocked: atLimit && !charmIds.includes(c.id),
            }))}
            isSelected={(id) => charmIds.includes(id)}
            onPick={toggleCharm}
            swingId={swingId}
            onSwingEnd={() => setSwingId(null)}
          />
        ) : null}
      </div>

      <p
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          "glove-body m-0 text-[14px] text-[var(--glove-text)]",
          hasAddOns && "mt-4 border-t border-[var(--glove-mist-line)] pt-3",
        )}
      >
        {hasAddOns ? (
          <>
            {totalParts.join(" · ")}
            <span aria-hidden="true"> → </span>
            <span className="sr-only">, </span>
            <strong className="text-[var(--glove-primary)]">
              {copy.totalLine} {formatPrice(total)}
            </strong>
          </>
        ) : null}
      </p>
    </section>
  );
}

type ChipItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  price: number | null;
  available: boolean;
  /** Unavailable because the charm limit is reached. */
  blocked?: boolean;
};

function ChipRow({
  mode,
  label,
  step,
  selectedLabel,
  extra,
  items,
  isSelected,
  onPick,
  swingId,
  onSwingEnd,
}: {
  mode: "single" | "multi";
  label: string;
  step: number | null;
  selectedLabel: string | null;
  extra?: ReactNode;
  items: ChipItem[];
  isSelected: (id: string) => boolean;
  onPick: (id: string) => void;
  swingId: string | null;
  onSwingEnd: () => void;
}) {
  const labelId = useId();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const single = mode === "single";
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => isSelected(item.id)),
  );

  // Single-select rows are a radio group: one tab stop, arrows move + pick.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!single) return;
    const radios = Array.from(
      rowRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ??
        [],
    );
    const focused = radios.indexOf(document.activeElement as HTMLButtonElement);
    const from = focused >= 0 ? focused : activeIndex;
    let to: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      to = (from + 1) % items.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      to = (from - 1 + items.length) % items.length;
    else if (event.key === "Home") to = 0;
    else if (event.key === "End") to = items.length - 1;
    if (to === null) return;
    event.preventDefault();
    radios[to]?.focus();
    radios[to]?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const item = items[to];
    if (item?.available) onPick(item.id);
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <GloveOptionLabel
        id={labelId}
        label={label}
        step={step}
        selectedLabel={selectedLabel}
        extra={extra}
      />
      <div
        ref={rowRef}
        role={single ? "radiogroup" : "group"}
        aria-labelledby={labelId}
        onKeyDown={onKeyDown}
        // Bleeds to the panel's edges (its p-4 / md:p-5) with the same inset
        // as padding + scroll-padding, so the first and last chips never sit
        // flush against the edge, at rest or after snapping.
        className="-mx-4 flex snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pt-1 pb-2 [scrollbar-width:thin] md:-mx-5 md:scroll-px-5 md:px-5"
      >
        {items.map((item, index) => {
          const selected = isSelected(item.id);
          const disabled = !item.available || (item.blocked ?? false);
          const status = !item.available
            ? "Sold out"
            : item.price !== null
              ? formatPrice(item.price)
              : "";
          return (
            <button
              key={item.id}
              type="button"
              role={single ? "radio" : "checkbox"}
              aria-checked={selected}
              aria-disabled={disabled || undefined}
              tabIndex={single ? (index === activeIndex ? 0 : -1) : undefined}
              onClick={disabled ? undefined : () => onPick(item.id)}
              className={cn(
                "relative flex w-[104px] flex-none snap-start flex-col items-center gap-1.5 rounded-[var(--glove-radius-card)] border bg-[var(--glove-paper)] px-2 pt-3 pb-2.5 text-center transition-[border-color,box-shadow] duration-150",
                selected
                  ? "border-[var(--glove-primary)] shadow-[0_0_0_1px_var(--glove-primary)]"
                  : disabled
                    ? "border-dashed border-[var(--glove-line)]"
                    : "border-[var(--glove-line)] hover:border-[var(--glove-primary-tint)]",
                // Unavailable chips fade only the picture; the name and the
                // "Sold out" label stay at full contrast (>= 4.5:1).
                disabled ? "cursor-not-allowed" : "cursor-pointer",
              )}
            >
              {selected ? (
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 right-1.5 inline-flex size-5 items-center justify-center rounded-full bg-[var(--glove-primary)] text-[var(--glove-on-primary)]"
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  "glove-swing relative block size-14 overflow-hidden rounded-[6px] bg-[var(--glove-wash)]",
                  disabled && "opacity-50",
                  swingId === item.id && "is-swinging",
                )}
                onAnimationEnd={swingId === item.id ? onSwingEnd : undefined}
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-contain"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-[var(--glove-muted)]">
                    <Ban className="size-6" strokeWidth={1.5} />
                  </span>
                )}
              </span>
              <span className="glove-display line-clamp-2 text-[12px] leading-tight font-medium text-[var(--glove-ink)]">
                {item.name}
              </span>
              {status ? (
                <span
                  className={cn(
                    "glove-body text-[12px] font-bold",
                    item.available
                      ? "text-[var(--glove-primary)]"
                      : "text-[var(--glove-muted)]",
                  )}
                >
                  {status}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

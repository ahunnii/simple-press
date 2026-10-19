"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useId, useRef } from "react";
import Image from "next/image";
import { Ban, Check } from "lucide-react";

import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";

import { GloveOptionLabel } from "./glove-variant-selector";

export type ChipItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  /** Hex colour shown in the picture well when there is no photo. */
  swatchColor?: string | null;
  /** Charged price in cents; null shows no price. */
  price: number | null;
  available: boolean;
  /** Unavailable because the pick limit is reached. */
  blocked?: boolean;
  /** Waived by the group's "first N included" rule: shows "Included". */
  included?: boolean;
  /**
   * Skip the image optimizer. Product-option photos are owner-uploaded and
   * their hosts are not all in `images.remotePatterns`.
   */
  unoptimized?: boolean;
};

/**
 * One labelled row of chips (a choice row of the product options panel,
 * `GloveCustomizer`): a horizontal track of 104px chips (56px image, name, price). A
 * chosen chip gets the purple ring, a check and (signature 2) swings once
 * from its top edge. Single rows are a radio group with a roving tab stop;
 * multi rows are checkbox groups. Sold-out chips stay visible but inert.
 */
export function ChipRow({
  mode,
  label,
  step,
  selectedLabel,
  extra,
  help,
  error,
  required,
  groupAttrs,
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
  /** Owner's help text for the group, under the label. */
  help?: string | null;
  /** Validation message, shown under the row in the alert colour. */
  error?: string | null;
  required?: boolean;
  /** Extra attributes for the row's wrapper (data hooks). */
  groupAttrs?: Record<string, string>;
  items: ChipItem[];
  isSelected: (id: string) => boolean;
  onPick: (id: string) => void;
  swingId: string | null;
  onSwingEnd: () => void;
}) {
  const labelId = useId();
  const helpId = useId();
  const errorId = useId();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const single = mode === "single";
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => isSelected(item.id)),
  );
  const describedBy =
    [help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

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
    <div
      className="flex min-w-0 flex-col gap-2"
      data-invalid={error ? "true" : undefined}
      {...groupAttrs}
    >
      <GloveOptionLabel
        id={labelId}
        label={label}
        step={step}
        selectedLabel={selectedLabel}
        extra={
          required || extra ? (
            <>
              {required ? (
                <span className="text-[13px] text-[var(--glove-muted)]">
                  Required
                </span>
              ) : null}
              {extra}
            </>
          ) : undefined
        }
      />
      {help ? (
        <p
          id={helpId}
          className="m-0 text-[13px] leading-snug text-[var(--glove-muted)]"
        >
          {help}
        </p>
      ) : null}
      <div
        ref={rowRef}
        role={single ? "radiogroup" : "group"}
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        aria-invalid={single && error ? true : undefined}
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
            : item.included
              ? "Included"
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
                  className="absolute top-1.5 right-1.5 z-10 inline-flex size-5 items-center justify-center rounded-full bg-[var(--glove-primary)] text-[var(--glove-on-primary)]"
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
                    unoptimized={item.unoptimized}
                    className="object-contain"
                  />
                ) : item.swatchColor ? (
                  <span
                    className="absolute inset-1.5 rounded-full border border-black/10"
                    style={{ backgroundColor: item.swatchColor }}
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
      {error ? (
        <p id={errorId} role="alert" className="glove-error m-0">
          {error}
        </p>
      ) : null}
    </div>
  );
}

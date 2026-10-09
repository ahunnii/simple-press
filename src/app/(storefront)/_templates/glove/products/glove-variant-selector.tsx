"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useId, useMemo, useRef } from "react";

import { cn } from "~/lib/utils";

import { GloveMedallion, GloveSelect } from "../shared";
import {
  isColorOptionName,
  isSizeOptionName,
  optionDisplayName,
  resolveSwatch,
  variantOptionGroups,
  variantOptionsOf,
} from "./glove-color";
import { gloveStepPlan, orderGloveGroups } from "./glove-steps";

type Variant = {
  id: string;
  name: string;
  inventoryQty: number;
  options: unknown;
};

type Props = {
  variants: Variant[];
  trackInventory: boolean;
  allowBackorders: boolean;
  selectedId: string | null;
  onSelect: (variantId: string) => void;
  /** Number each control row with the Easy Guide step medallion. */
  numbered: boolean;
  /**
   * Step number per option key, computed once by the buy box so the numbers
   * run on through the add-on picker. Omitted: this selector numbers its own
   * rows from 1.
   */
  steps?: Record<string, number>;
};

/**
 * Grouped option selector (logic ported from olive's variant selector, glove
 * styling): Size → 40px square buttons; Color → 28px swatches in 44px hit
 * areas with a visible "Color: Navy" label; every other dimension (Grommet
 * and O-Ring, gift-card Amount) → a `GloveSelect`. Sold-out values stay in
 * place, marked and unselectable. Choosing a value keeps the other choices
 * and falls back to the first available variant carrying it when that exact
 * combination doesn't exist.
 */
export function GloveVariantSelector({
  variants,
  trackInventory,
  allowBackorders,
  selectedId,
  onSelect,
  numbered,
  steps,
}: Props) {
  // Easy Guide order (Color, Size, Grommet) whatever order the owner entered
  // the options in; unnumbered dimensions trail.
  const groups = useMemo(
    () => orderGloveGroups(variantOptionGroups(variants), numbered),
    [variants, numbered],
  );
  const stepByKey = useMemo(
    () =>
      steps ??
      gloveStepPlan(
        groups.map((group) => group.key),
        numbered,
      ).options,
    [steps, groups, numbered],
  );
  const selected =
    variants.find((v) => v.id === selectedId) ?? variants[0] ?? null;
  const selectedOptions = selected ? variantOptionsOf(selected.options) : {};

  const countsStock = trackInventory && !allowBackorders;
  const variantSoldOut = (v: Variant) => countsStock && v.inventoryQty <= 0;
  const valueSoldOut = (key: string, value: string) => {
    const matching = variants.filter(
      (v) => variantOptionsOf(v.options)[key] === value,
    );
    return matching.length > 0 && matching.every(variantSoldOut);
  };

  const chooseValue = (key: string, value: string) => {
    const wanted = { ...selectedOptions, [key]: value };
    const exact = variants.find((v) => {
      const options = variantOptionsOf(v.options);
      return Object.entries(wanted).every(([k, val]) => options[k] === val);
    });
    const carrying = variants.filter(
      (v) => variantOptionsOf(v.options)[key] === value,
    );
    const next =
      exact ?? carrying.find((v) => !variantSoldOut(v)) ?? carrying[0];
    if (next) onSelect(next.id);
  };

  // Variants with no option JSON: one select over the variant names.
  if (groups.length === 0) {
    return (
      <SelectRow
        label="Option"
        step={null}
        value={selected?.id ?? ""}
        onChange={onSelect}
        items={variants.map((v) => ({
          value: v.id,
          label: v.name,
          soldOut: variantSoldOut(v),
        }))}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => {
        const value = selectedOptions[group.key] ?? null;
        const step = numbered ? (stepByKey[group.key] ?? null) : null;
        const items = group.values.map((option) => ({
          value: option,
          label: option,
          soldOut: valueSoldOut(group.key, option),
        }));

        if (isColorOptionName(group.key)) {
          return (
            <RadioRow
              key={group.key}
              label={optionDisplayName(group.key)}
              step={step}
              selectedLabel={value}
              value={value}
              items={items}
              onChange={(next) => chooseValue(group.key, next)}
              className="gap-1"
              renderItem={(item, isSelected) => {
                const swatch = resolveSwatch(item.value);
                return (
                  <span
                    aria-hidden="true"
                    title={item.label}
                    className={cn(
                      "relative flex size-7 items-center justify-center rounded-full border transition-shadow duration-150",
                      // Mid-strength edge so pale colours (Ivory, White) still
                      // read as a disc on paper (>= 3:1, WCAG 1.4.11).
                      "border-[color-mix(in_srgb,var(--glove-ink)_55%,transparent)]",
                      isSelected &&
                        "shadow-[0_0_0_2px_var(--glove-paper),0_0_0_4px_var(--glove-primary)]",
                    )}
                  >
                    {/* Only this fill fades when sold out; the edge and the
                        selected ring stay at full strength. */}
                    <span
                      className={cn(
                        "absolute inset-0 overflow-hidden rounded-full",
                        swatch.unknown && "bg-[var(--glove-mist)]",
                        item.soldOut && "opacity-40",
                      )}
                      style={
                        swatch.unknown
                          ? undefined
                          : { backgroundColor: swatch.color }
                      }
                    />
                    {swatch.unknown ? (
                      <span
                        className={cn(
                          "relative text-[11px] font-bold text-[var(--glove-primary)]",
                          item.soldOut && "opacity-60",
                        )}
                      >
                        {item.label.charAt(0).toUpperCase()}
                      </span>
                    ) : null}
                    {item.soldOut ? (
                      <span className="absolute inset-0 overflow-hidden rounded-full">
                        <span className="absolute top-1/2 left-1/2 h-0.5 w-9 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[var(--glove-ink)]" />
                      </span>
                    ) : null}
                  </span>
                );
              }}
              itemClassName="size-11 rounded-full"
            />
          );
        }

        if (isSizeOptionName(group.key)) {
          return (
            <RadioRow
              key={group.key}
              label={optionDisplayName(group.key)}
              step={step}
              selectedLabel={value}
              value={value}
              items={items}
              onChange={(next) => chooseValue(group.key, next)}
              className="gap-2"
              itemClassName="min-h-11 min-w-11"
              renderItem={(item, isSelected) => (
                <span
                  aria-hidden="true"
                  className={cn(
                    "glove-display flex h-10 min-w-10 items-center justify-center rounded-[3px] border px-2 text-[12px] font-semibold transition-colors duration-150",
                    isSelected
                      ? "border-[var(--glove-primary)] bg-[var(--glove-primary)] text-[var(--glove-on-primary)]"
                      : "border-[var(--glove-line)] bg-[var(--glove-paper)] text-[var(--glove-ink)] group-hover:border-[var(--glove-primary)]",
                    // Sold out: dashed edge + struck text, never faded, so the
                    // outline (and a selected fill) keeps its contrast.
                    item.soldOut && "line-through",
                    item.soldOut &&
                      !isSelected &&
                      "border-dashed border-[var(--glove-muted)] bg-[var(--glove-wash)] text-[var(--glove-muted)]",
                  )}
                >
                  {item.label}
                </span>
              )}
            />
          );
        }

        return (
          <SelectRow
            key={group.key}
            label={optionDisplayName(group.key)}
            step={step}
            value={value ?? ""}
            onChange={(next) => chooseValue(group.key, next)}
            items={items}
          />
        );
      })}
    </div>
  );
}

type Item = { value: string; label: string; soldOut: boolean };

/** "[2] Colors: Navy" — the label line every control row shares. */
export function GloveOptionLabel({
  label,
  step,
  selectedLabel,
  id,
  htmlFor,
  extra,
}: {
  label: string;
  step: number | null;
  selectedLabel?: string | null;
  id?: string;
  htmlFor?: string;
  extra?: ReactNode;
}) {
  const Tag = htmlFor ? "label" : "p";
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {step !== null ? (
        <GloveMedallion size="sm">
          <span className="sr-only">Step </span>
          {step}
        </GloveMedallion>
      ) : null}
      <Tag
        id={id}
        htmlFor={htmlFor}
        className="glove-display text-[14px] font-medium text-[var(--glove-ink)]"
      >
        {label}
        {selectedLabel ? ":" : null}
        {selectedLabel ? (
          <span className="glove-body ml-1.5 font-normal text-[var(--glove-text)]">
            {selectedLabel}
          </span>
        ) : null}
      </Tag>
      {extra}
    </div>
  );
}

/** Roving-tabindex radio group: Arrow keys move + select, Home/End jump. */
function RadioRow({
  label,
  step,
  selectedLabel,
  value,
  items,
  onChange,
  renderItem,
  className,
  itemClassName,
}: {
  label: string;
  step: number | null;
  selectedLabel: string | null;
  value: string | null;
  items: Item[];
  onChange: (value: string) => void;
  renderItem: (item: Item, isSelected: boolean) => ReactNode;
  className?: string;
  itemClassName?: string;
}) {
  const labelId = useId();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  );

  const radios = () =>
    Array.from(
      rowRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ??
        [],
    );

  const moveTo = (index: number) => {
    const item = items[index];
    if (!item) return;
    radios()[index]?.focus();
    if (!item.soldOut) onChange(item.value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const focused = radios().indexOf(
      document.activeElement as HTMLButtonElement,
    );
    const from = focused >= 0 ? focused : activeIndex;
    const keys: Record<string, number> = {
      ArrowRight: (from + 1) % items.length,
      ArrowDown: (from + 1) % items.length,
      ArrowLeft: (from - 1 + items.length) % items.length,
      ArrowUp: (from - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    };
    const target = keys[event.key];
    if (target === undefined) return;
    event.preventDefault();
    moveTo(target);
  };

  return (
    <div className="flex flex-col gap-2">
      <GloveOptionLabel
        id={labelId}
        label={label}
        step={step}
        selectedLabel={selectedLabel}
      />
      <div
        ref={rowRef}
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={onKeyDown}
        className={cn("flex flex-wrap items-center", className)}
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
              aria-label={item.soldOut ? `${item.label}, sold out` : item.label}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={item.soldOut ? undefined : () => onChange(item.value)}
              className={cn(
                "group inline-flex items-center justify-center",
                item.soldOut ? "cursor-not-allowed" : "cursor-pointer",
                itemClassName,
              )}
            >
              {renderItem(item, isSelected)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectRow({
  label,
  step,
  value,
  onChange,
  items,
}: {
  label: string;
  step: number | null;
  value: string;
  onChange: (value: string) => void;
  items: Item[];
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <GloveOptionLabel label={label} step={step} htmlFor={id} />
      <GloveSelect
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {items.map((item) => (
          <option key={item.value} value={item.value} disabled={item.soldOut}>
            {item.soldOut ? `${item.label} (sold out)` : item.label}
          </option>
        ))}
      </GloveSelect>
    </div>
  );
}

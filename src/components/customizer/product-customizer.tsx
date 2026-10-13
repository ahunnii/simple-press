"use client";

/* eslint-disable @next/next/no-img-element --
   Option photos are owner-uploaded storage URLs on arbitrary hosts (not all
   covered by next.config `images.remotePatterns`), so a plain lazy <img> is
   used instead of next/image — same call as the forms picture-choice field. */
import { useEffect, useId, useRef } from "react";
import { Check } from "lucide-react";

import type { ProductCustomizerController } from "./use-product-customizer";
import type {
  PublicCustomizerGroup,
  PublicCustomizerValue,
} from "~/lib/customizer";
import { customizerTextLength, textLimit } from "~/lib/customizer";
import { formatPrice as defaultFormatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";

/**
 * Shared storefront renderer for product options (the customizer).
 *
 * Headless-ish: neutral Tailwind on theme tokens only (no template colors),
 * native inputs (visually hidden radios / checkboxes inside <label> tiles,
 * like `~/components/forms/picture-choice-field.tsx`), no Radix and no
 * portals, so it stays inside a template's scope class. A template styles it
 * with CSS on the data-slot hooks below, or per slot via `classNames`.
 *
 * DOM outline:
 *
 *   div[data-slot=customizer]
 *     fieldset[data-slot=customizer-group][data-kind=choice|text]
 *             [data-display=tiles|swatches|list][data-invalid]
 *       legend[data-slot=customizer-legend]
 *       p[data-slot=customizer-help]
 *       p[data-slot=customizer-count]            ("2 of 3 · 1 included")
 *       div[data-slot=customizer-values]
 *         label[data-slot=customizer-value][data-selected][data-disabled]
 *              [data-included]
 *           input (sr-only radio / checkbox)
 *           img[data-slot=customizer-value-image] | span[data-slot=customizer-swatch]
 *           span[data-slot=customizer-value-label]
 *           span[data-slot=customizer-value-price]  ("+$5.00" / "Included" / "Sold out")
 *       button[data-slot=customizer-clear]        (optional one-pick groups)
 *       div[data-slot=customizer-text]            (text groups)
 *         input
 *         span[data-slot=customizer-text-counter]
 *       p[data-slot=customizer-limit][aria-live=polite]
 *       p[data-slot=customizer-error]
 *     ul[data-slot=customizer-tray]               (showTray)
 *       li[data-slot=customizer-tray-item]
 *     p[data-slot=customizer-total][aria-live=polite]  (showTotal)
 *
 * `ProductCustomizerTray` and `ProductCustomizerTotal` are exported on their
 * own so a template can place the tray beside its main photo and the total
 * by its price.
 */

export type ProductCustomizerSlot =
  | "root"
  | "group"
  | "legend"
  | "help"
  | "count"
  | "values"
  | "value"
  | "valueImage"
  | "swatch"
  | "valueLabel"
  | "valuePrice"
  | "clear"
  | "text"
  | "textInput"
  | "textCounter"
  | "limit"
  | "error";

export type ProductCustomizerClassNames = Partial<
  Record<ProductCustomizerSlot, string>
>;

type FormatPrice = (cents: number) => string;

export type ProductCustomizerProps = {
  controller: ProductCustomizerController;
  formatPrice?: FormatPrice;
  /** Render the chosen-items tray at the bottom (default true). */
  showTray?: boolean;
  /** Render the live total at the bottom (default false: most pages show the price elsewhere). */
  showTotal?: boolean;
  className?: string;
  classNames?: ProductCustomizerClassNames;
  trayClassNames?: ProductCustomizerTrayClassNames;
  totalClassName?: string;
  /**
   * Move focus to the first invalid group after an add attempt
   * (`controller.revealErrors()`). Default true.
   */
  focusOnError?: boolean;
};

function priceText(
  value: PublicCustomizerValue,
  included: boolean,
  formatPrice: FormatPrice,
): string | null {
  if (!value.available) return "Sold out";
  if (included) return "Included";
  if (value.price > 0) return `+${formatPrice(value.price)}`;
  return null;
}

function countText(group: PublicCustomizerGroup, picked: number) {
  const parts: string[] = [];
  if (group.maxSelections > 1) {
    parts.push(`${picked} of ${group.maxSelections}`);
  }
  if (group.includedCount > 0) {
    parts.push(
      group.includedCount === 1
        ? "1 included"
        : `${group.includedCount} included`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function ValueVisual({
  value,
  display,
  classNames,
}: {
  value: PublicCustomizerValue;
  display: PublicCustomizerGroup["display"];
  classNames?: ProductCustomizerClassNames;
}) {
  const round = display === "swatches";
  if (value.imageUrl) {
    return (
      <img
        data-slot="customizer-value-image"
        src={value.imageUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn(
          "aspect-square object-cover",
          display === "list"
            ? "size-10 rounded-md"
            : round
              ? "size-10 rounded-full"
              : "w-full rounded-md",
          classNames?.valueImage,
        )}
      />
    );
  }
  if (value.swatchColor) {
    return (
      <span
        aria-hidden="true"
        data-slot="customizer-swatch"
        className={cn(
          "block shrink-0 border border-black/10",
          display === "tiles"
            ? "aspect-square w-full rounded-md"
            : "size-10 rounded-full",
          classNames?.swatch,
        )}
        style={{ backgroundColor: value.swatchColor }}
      />
    );
  }
  return null;
}

function ChoiceGroup({
  group,
  controller,
  formatPrice,
  classNames,
  baseId,
}: {
  group: PublicCustomizerGroup;
  controller: ProductCustomizerController;
  formatPrice: FormatPrice;
  classNames?: ProductCustomizerClassNames;
  baseId: string;
}) {
  const single = group.maxSelections <= 1;
  const legendId = `${baseId}-legend`;
  const helpId = `${baseId}-help`;
  const countId = `${baseId}-count`;
  const errorId = `${baseId}-error`;
  const limitId = `${baseId}-limit`;
  const errors = controller.groupErrors[group.id] ?? [];
  const limit = controller.limitMessages[group.id];
  const invalid = errors.length > 0;
  const picked = group.values.filter((v) =>
    controller.isSelected(group.id, v.id),
  ).length;
  const count = countText(group, picked);
  const describedBy =
    [
      group.helpText ? helpId : null,
      count ? countId : null,
      invalid ? errorId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <fieldset
      data-slot="customizer-group"
      data-kind="choice"
      data-display={group.display}
      data-invalid={invalid ? "true" : undefined}
      aria-describedby={describedBy}
      className={cn("min-w-0 space-y-2", classNames?.group)}
    >
      <legend
        id={legendId}
        data-slot="customizer-legend"
        className={cn("text-sm font-medium", classNames?.legend)}
      >
        {group.name}
        {group.required && (
          <span aria-hidden="true" className="text-muted-foreground">
            {" "}
            *
          </span>
        )}
        {group.required && <span className="sr-only"> (required)</span>}
      </legend>
      {group.helpText && (
        <p
          id={helpId}
          data-slot="customizer-help"
          className={cn("text-muted-foreground text-sm", classNames?.help)}
        >
          {group.helpText}
        </p>
      )}
      {count && (
        <p
          id={countId}
          data-slot="customizer-count"
          className={cn("text-muted-foreground text-xs", classNames?.count)}
        >
          {count}
        </p>
      )}

      <div
        data-slot="customizer-values"
        className={cn(
          group.display === "list"
            ? "flex flex-col gap-2"
            : group.display === "swatches"
              ? "flex flex-wrap gap-2"
              : "grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2",
          classNames?.values,
        )}
      >
        {group.values.map((value) => {
          const inputId = `${baseId}-${value.id}`;
          const selected = controller.isSelected(group.id, value.id);
          const disabled = !value.available && !selected;
          const included =
            selected && controller.includedValueIds.has(value.id);
          const price = priceText(value, included, formatPrice);
          return (
            <label
              key={value.id}
              htmlFor={inputId}
              data-slot="customizer-value"
              data-selected={selected ? "true" : "false"}
              data-disabled={disabled ? "true" : undefined}
              data-included={included ? "true" : undefined}
              className={cn(
                "bg-background relative flex min-w-0 cursor-pointer rounded-md border p-2 text-sm transition-colors",
                "hover:bg-muted/50 has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
                group.display === "list"
                  ? "items-center gap-3"
                  : group.display === "swatches"
                    ? "flex-col items-center gap-1 text-center"
                    : "flex-col items-center gap-1.5 text-center",
                selected
                  ? "border-primary ring-primary ring-2"
                  : "border-input",
                disabled &&
                  "cursor-not-allowed opacity-50 hover:bg-transparent",
                classNames?.value,
              )}
            >
              <input
                id={inputId}
                type={single ? "radio" : "checkbox"}
                name={single ? baseId : undefined}
                value={value.id}
                checked={selected}
                disabled={disabled}
                aria-invalid={invalid || undefined}
                className="sr-only"
                onChange={() => controller.toggleValue(group.id, value.id)}
              />
              <ValueVisual
                value={value}
                display={group.display}
                classNames={classNames}
              />
              <span
                data-slot="customizer-value-label"
                className={cn(
                  "leading-tight break-words",
                  group.display === "list" && "flex-1",
                  classNames?.valueLabel,
                )}
              >
                {value.label}
              </span>
              {price && (
                <span
                  data-slot="customizer-value-price"
                  className={cn(
                    "text-muted-foreground text-xs",
                    classNames?.valuePrice,
                  )}
                >
                  {price}
                </span>
              )}
              {selected && (
                <span
                  aria-hidden="true"
                  className="bg-primary text-primary-foreground absolute top-1 right-1 flex size-4 items-center justify-center rounded-full"
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </label>
          );
        })}
      </div>

      {single && !group.required && picked > 0 && (
        <button
          type="button"
          data-slot="customizer-clear"
          onClick={() => controller.clearGroup(group.id)}
          className={cn(
            "text-muted-foreground hover:text-foreground text-xs underline underline-offset-2",
            classNames?.clear,
          )}
        >
          Clear {group.name.toLowerCase()}
        </button>
      )}

      <p
        id={limitId}
        data-slot="customizer-limit"
        aria-live="polite"
        className={cn(
          "text-muted-foreground text-xs empty:hidden",
          classNames?.limit,
        )}
      >
        {limit ?? ""}
      </p>
      {invalid && (
        <p
          id={errorId}
          data-slot="customizer-error"
          className={cn("text-destructive text-sm", classNames?.error)}
        >
          {errors.join(". ")}
        </p>
      )}
    </fieldset>
  );
}

function TextGroup({
  group,
  controller,
  formatPrice,
  classNames,
  baseId,
}: {
  group: PublicCustomizerGroup;
  controller: ProductCustomizerController;
  formatPrice: FormatPrice;
  classNames?: ProductCustomizerClassNames;
  baseId: string;
}) {
  const legendId = `${baseId}-legend`;
  const helpId = `${baseId}-help`;
  const counterId = `${baseId}-counter`;
  const errorId = `${baseId}-error`;
  const errors = controller.groupErrors[group.id] ?? [];
  const invalid = errors.length > 0;
  const limit = textLimit(group);
  const text = controller.getText(group.id);
  const length = customizerTextLength(text);
  const describedBy = [
    group.helpText ? helpId : null,
    counterId,
    invalid ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <fieldset
      data-slot="customizer-group"
      data-kind="text"
      data-display={group.display}
      data-invalid={invalid ? "true" : undefined}
      className={cn("min-w-0 space-y-2", classNames?.group)}
    >
      <legend
        id={legendId}
        data-slot="customizer-legend"
        className={cn("text-sm font-medium", classNames?.legend)}
      >
        {group.name}
        {group.required && (
          <span aria-hidden="true" className="text-muted-foreground">
            {" "}
            *
          </span>
        )}
        {group.textPriceCents > 0 && (
          <span
            data-slot="customizer-value-price"
            className={cn(
              "text-muted-foreground ml-2 text-xs font-normal",
              classNames?.valuePrice,
            )}
          >
            +{formatPrice(group.textPriceCents)}
          </span>
        )}
      </legend>
      {group.helpText && (
        <p
          id={helpId}
          data-slot="customizer-help"
          className={cn("text-muted-foreground text-sm", classNames?.help)}
        >
          {group.helpText}
        </p>
      )}
      <div
        data-slot="customizer-text"
        className={cn("flex flex-col gap-1", classNames?.text)}
      >
        <input
          id={`${baseId}-input`}
          type="text"
          value={text}
          maxLength={limit}
          placeholder={group.placeholder ?? undefined}
          aria-labelledby={legendId}
          aria-describedby={describedBy}
          aria-required={group.required || undefined}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          onChange={(event) => controller.setText(group.id, event.target.value)}
          className={cn(
            "border-input bg-background h-10 w-full rounded-md border px-3 text-sm outline-none",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            invalid && "border-destructive",
            classNames?.textInput,
          )}
        />
        <span
          id={counterId}
          data-slot="customizer-text-counter"
          className={cn(
            "text-muted-foreground self-end text-xs tabular-nums",
            classNames?.textCounter,
          )}
        >
          {length} / {limit}
          <span className="sr-only"> characters</span>
        </span>
      </div>
      {invalid && (
        <p
          id={errorId}
          data-slot="customizer-error"
          className={cn("text-destructive text-sm", classNames?.error)}
        >
          {errors.join(". ")}
        </p>
      )}
    </fieldset>
  );
}

export function ProductCustomizer({
  controller,
  formatPrice = defaultFormatPrice,
  showTray = true,
  showTotal = false,
  className,
  classNames,
  trayClassNames,
  totalClassName,
  focusOnError = true,
}: ProductCustomizerProps) {
  const reactId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const { attempt, definition } = controller;

  // After an add attempt, take the shopper to the first group with an error.
  useEffect(() => {
    if (!focusOnError || attempt === 0) return;
    const group = rootRef.current?.querySelector<HTMLElement>(
      '[data-slot="customizer-group"][data-invalid="true"]',
    );
    group
      ?.querySelector<HTMLElement>("input:not([disabled])")
      ?.focus({ preventScroll: false });
  }, [attempt, focusOnError]);

  if (!definition) return null;
  const idBase = `customizer${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <div
      ref={rootRef}
      data-slot="customizer"
      className={cn("flex flex-col gap-5", classNames?.root, className)}
    >
      {definition.groups.map((group) =>
        group.kind === "text" ? (
          <TextGroup
            key={group.id}
            group={group}
            controller={controller}
            formatPrice={formatPrice}
            classNames={classNames}
            baseId={`${idBase}-${group.id}`}
          />
        ) : (
          <ChoiceGroup
            key={group.id}
            group={group}
            controller={controller}
            formatPrice={formatPrice}
            classNames={classNames}
            baseId={`${idBase}-${group.id}`}
          />
        ),
      )}
      {showTray && (
        <ProductCustomizerTray
          controller={controller}
          classNames={trayClassNames}
        />
      )}
      {showTotal && (
        <ProductCustomizerTotal
          controller={controller}
          formatPrice={formatPrice}
          className={totalClassName}
        />
      )}
    </div>
  );
}

export type ProductCustomizerTrayClassNames = Partial<
  Record<"root" | "item" | "image" | "swatch" | "label", string>
>;

/**
 * "Your build": the chosen values (photo or swatch + label) and filled text
 * options, in group order. Renders nothing until something is chosen.
 */
export function ProductCustomizerTray({
  controller,
  label = "Your selections",
  className,
  classNames,
}: {
  controller: ProductCustomizerController;
  /** Accessible name for the list. */
  label?: string;
  className?: string;
  classNames?: ProductCustomizerTrayClassNames;
}) {
  const { selectedValues, selectedTexts } = controller;
  if (selectedValues.length === 0 && selectedTexts.length === 0) return null;
  return (
    <ul
      data-slot="customizer-tray"
      aria-label={label}
      className={cn("flex flex-wrap gap-2", classNames?.root, className)}
    >
      {selectedValues.map((value) => (
        <li
          key={`${value.groupId}:${value.valueId}`}
          data-slot="customizer-tray-item"
          data-included={value.included ? "true" : undefined}
          className={cn(
            "border-input bg-background flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-xs",
            classNames?.item,
          )}
        >
          {value.imageUrl ? (
            <img
              src={value.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className={cn(
                "size-6 rounded-full object-cover",
                classNames?.image,
              )}
            />
          ) : value.swatchColor ? (
            <span
              aria-hidden="true"
              className={cn(
                "size-6 rounded-full border border-black/10",
                classNames?.swatch,
              )}
              style={{ backgroundColor: value.swatchColor }}
            />
          ) : null}
          <span className={classNames?.label}>
            <span className="sr-only">{value.groupName}: </span>
            {value.label}
          </span>
        </li>
      ))}
      {selectedTexts.map((text) => (
        <li
          key={text.groupId}
          data-slot="customizer-tray-item"
          data-kind="text"
          className={cn(
            "border-input bg-background flex items-center rounded-full border px-3 py-1 text-xs",
            classNames?.item,
          )}
        >
          <span className={classNames?.label}>
            <span className="sr-only">{text.groupName}: </span>“{text.text}”
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Live configured unit price, announced politely as it changes. */
export function ProductCustomizerTotal({
  controller,
  formatPrice = defaultFormatPrice,
  label = "Total",
  className,
}: {
  controller: ProductCustomizerController;
  formatPrice?: FormatPrice;
  label?: string;
  className?: string;
}) {
  if (!controller.enabled) return null;
  return (
    <p
      data-slot="customizer-total"
      aria-live="polite"
      aria-atomic="true"
      className={cn("text-sm font-medium", className)}
    >
      {label} {formatPrice(controller.unitPrice)}
    </p>
  );
}

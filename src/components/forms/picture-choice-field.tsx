"use client";

/* eslint-disable @next/next/no-img-element --
   Option / reference photos are owner-uploaded storage URLs on arbitrary
   hosts (not all covered by next.config `images.remotePatterns`), so a plain
   lazy <img> is used instead of next/image. */
import { Check, Minus, Plus } from "lucide-react";

import type {
  FormPictureChoiceField,
  FormPictureOption,
} from "~/lib/validators/form";
import { cn } from "~/lib/utils";

/**
 * "Picture choice" form field: tiles (photo / color swatch / label chip) the
 * customer picks one of, several of, or enters a quantity for.
 *
 * Native inputs only (visually-hidden radios / checkboxes inside <label>
 * tiles, a plain number input + buttons for quantities) so everything stays
 * inside the storefront template's scope class — no Radix, no portals.
 *
 * DOM outline (hooks for template CSS):
 *
 *   fieldset[data-slot=picture-choice][data-selection][data-tile-size]
 *     legend
 *     p#…-description
 *     div[data-slot=picture-choice-reference] > img
 *     div[data-slot=picture-choice-grid][role=radiogroup (one only)]
 *       label|div[data-slot=picture-choice-option][data-selected][data-kind]
 *         input (sr-only radio/checkbox; quantity mode has no hidden input)
 *         span|button[data-slot=picture-choice-swatch][data-kind=image|color]
 *           img (image kind)
 *         span[data-slot=picture-choice-label]
 *         span[data-slot=picture-choice-check] (selected badge)
 *         div[data-slot=picture-choice-stepper] (quantity only)
 *           button[data-slot=picture-choice-step][data-direction=minus]
 *           input[type=number]
 *           button[data-slot=picture-choice-step][data-direction=plus]
 *     p[data-slot=picture-choice-total][aria-live=polite]
 *     button[data-slot=picture-choice-clear] (one mode, optional, when picked)
 *     p.error
 */

const MAX_QUANTITY = 999;

type PictureChoiceFieldProps = {
  field: FormPictureChoiceField;
  value: unknown;
  fieldDomId: string;
  /** Space-separated description + error ids, for the fieldset. */
  describedBy: string | undefined;
  descriptionId: string | undefined;
  errorId: string | undefined;
  error: string | undefined;
  onChange: (value: unknown) => void;
  registerRef: (el: HTMLElement | null) => void;
};

type TileKind = "image" | "color" | "label";

function tileKind(option: FormPictureOption): TileKind {
  if (option.imageUrl) return "image";
  if (option.color) return "color";
  return "label";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** `{ optionId: qty }` -> only entries for known options, positive ints. */
function asQuantityRecord(
  value: unknown,
  options: FormPictureOption[],
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  const record = value as Record<string, unknown>;
  for (const option of options) {
    const raw = record[option.id];
    const n = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(n) && n > 0) out[option.id] = Math.floor(n);
  }
  return out;
}

function parseQuantityInput(raw: string): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(MAX_QUANTITY, n);
}

const tileBaseClass =
  "relative flex min-w-0 flex-col items-center gap-1.5 rounded-lg border bg-background p-2 text-center transition-colors";

function tileStateClass(selected: boolean) {
  return selected
    ? "border-primary ring-primary bg-primary/5 ring-2"
    : "border-input";
}

const tileInteractiveClass =
  "cursor-pointer hover:bg-muted/50 has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50";

function CheckBadge({ selected }: { selected: boolean }) {
  if (!selected) return null;
  return (
    <span
      aria-hidden="true"
      data-slot="picture-choice-check"
      className="bg-primary text-primary-foreground absolute top-1 right-1 flex size-5 items-center justify-center rounded-full shadow-sm"
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}

/** The picture part of a tile. Label-only tiles have no swatch element. */
function SwatchVisual({
  option,
  large,
  asButton,
  onPress,
  disabled,
}: {
  option: FormPictureOption;
  large: boolean;
  asButton?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const kind = tileKind(option);
  if (kind === "label") return null;

  const content =
    kind === "image" ? (
      <img
        src={option.imageUrl ?? undefined}
        alt=""
        loading="lazy"
        decoding="async"
        // Small tiles are swatch-sized, so a photo matches the color circles
        // beside it (a balloon "Confetti" tile next to plain colors).
        className={cn(
          "aspect-square object-cover",
          large ? "w-full rounded-lg" : "size-10 rounded-full",
        )}
      />
    ) : (
      <span
        aria-hidden="true"
        className={cn(
          "block border border-black/10",
          large ? "aspect-square w-full rounded-lg" : "size-10 rounded-full",
        )}
        style={{ backgroundColor: option.color ?? undefined }}
      />
    );

  const className = cn(
    "flex w-full items-center justify-center",
    asButton && "cursor-pointer",
  );

  if (asButton) {
    // Pointer convenience only ("tap the tile to add one"). The stepper's +
    // button is the keyboard / screen-reader path, so this one is skipped in
    // the tab order and hidden from the accessibility tree.
    return (
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onClick={onPress}
        data-slot="picture-choice-swatch"
        data-kind={kind}
        className={cn(className, "disabled:cursor-not-allowed")}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      data-slot="picture-choice-swatch"
      data-kind={kind}
      className={className}
    >
      {content}
    </span>
  );
}

function TileLabel({
  option,
  showLabels,
  large,
}: {
  option: FormPictureOption;
  showLabels: boolean;
  large: boolean;
}) {
  const kind = tileKind(option);
  // A tile with no picture IS its label (e.g. a "7" chip) — always visible.
  const visible = kind === "label" || showLabels;
  return (
    <span
      data-slot="picture-choice-label"
      className={cn(
        "leading-tight break-words",
        large ? "text-sm" : "text-xs",
        visible ? "font-medium" : "sr-only",
        kind === "label" &&
          "bg-muted flex min-h-9 w-full items-center justify-center rounded-md px-2 text-sm",
      )}
    >
      {option.label}
    </span>
  );
}

export function PictureChoiceField({
  field,
  value,
  fieldDomId,
  describedBy,
  descriptionId,
  errorId,
  error,
  onChange,
  registerRef,
}: PictureChoiceFieldProps) {
  const { options, selection, showLabels } = field;
  const large = field.tileSize === "large";
  const invalid = !!error;
  const legendId = `${fieldDomId}-legend`;
  const minTotal = field.minTotal ?? null;
  const maxTotal = field.maxTotal ?? null;

  const selectedId = typeof value === "string" ? value : "";
  const selectedIds = asStringArray(value);
  const quantities = asQuantityRecord(value, options);
  const quantityTotal = Object.values(quantities).reduce((a, b) => a + b, 0);

  const gridMin =
    selection === "quantity" ? (large ? 150 : 108) : large ? 140 : 72;
  const gridStyle = {
    gridTemplateColumns: `repeat(auto-fill, minmax(${gridMin}px, 1fr))`,
  };

  const setQuantity = (optionId: string, next: number) => {
    const record = { ...quantities };
    if (next > 0) record[optionId] = next;
    else delete record[optionId];
    onChange(record);
  };

  // --- running total / counter -------------------------------------------
  let totalText: string | null = null;
  let belowMin = false;
  if (selection === "quantity") {
    totalText =
      maxTotal != null
        ? `${quantityTotal} of ${maxTotal} chosen`
        : `${quantityTotal} chosen`;
    belowMin = minTotal != null && quantityTotal < minTotal;
  } else if (selection === "many") {
    totalText =
      maxTotal != null
        ? `${selectedIds.length} of ${maxTotal} selected`
        : `${selectedIds.length} selected`;
    belowMin = minTotal != null && selectedIds.length < minTotal;
  }
  const atMax =
    maxTotal != null &&
    (selection === "quantity"
      ? quantityTotal >= maxTotal
      : selectedIds.length >= maxTotal);

  return (
    <fieldset
      data-slot="picture-choice"
      data-selection={selection}
      data-tile-size={field.tileSize}
      aria-describedby={describedBy}
      className="min-w-0 space-y-2"
    >
      <legend
        id={legendId}
        className="flex items-center gap-1 text-sm leading-none font-medium"
      >
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </legend>
      {field.description && (
        <p id={descriptionId} className="text-muted-foreground text-sm">
          {field.description}
        </p>
      )}
      {field.referenceImageUrl && (
        <div data-slot="picture-choice-reference">
          <img
            src={field.referenceImageUrl}
            alt={`Reference image for ${field.label}`}
            loading="lazy"
            decoding="async"
            className="border-input max-h-[480px] w-full rounded-lg border object-contain"
          />
        </div>
      )}

      <div
        data-slot="picture-choice-grid"
        role={selection === "one" ? "radiogroup" : undefined}
        aria-labelledby={selection === "one" ? legendId : undefined}
        aria-required={
          selection === "one" ? field.required || undefined : undefined
        }
        className="grid gap-2"
        style={gridStyle}
      >
        {options.map((option, index) => {
          const kind = tileKind(option);
          const inputId = `${fieldDomId}-${option.id}`;
          const ref =
            index === 0
              ? (el: HTMLInputElement | null) => registerRef(el)
              : undefined;

          if (selection === "quantity") {
            const qty = quantities[option.id] ?? 0;
            const selected = qty > 0;
            const plusDisabled = qty >= MAX_QUANTITY || atMax;
            const btnSize = large ? "size-8" : "size-7";
            return (
              <div
                key={option.id}
                data-slot="picture-choice-option"
                data-selected={selected ? "true" : "false"}
                data-kind={kind}
                className={cn(
                  tileBaseClass,
                  tileStateClass(selected),
                  "focus-within:outline-ring focus-within:outline-2 focus-within:outline-offset-2",
                )}
              >
                <SwatchVisual
                  option={option}
                  large={large}
                  asButton
                  disabled={plusDisabled}
                  onPress={() => setQuantity(option.id, qty + 1)}
                />
                <TileLabel
                  option={option}
                  showLabels={showLabels}
                  large={large}
                />
                <CheckBadge selected={selected} />
                <div
                  data-slot="picture-choice-stepper"
                  className="mt-auto flex items-center justify-center gap-0.5"
                >
                  <button
                    type="button"
                    data-slot="picture-choice-step"
                    data-direction="minus"
                    aria-label={`Remove one ${option.label}`}
                    disabled={qty <= 0}
                    onClick={() => setQuantity(option.id, qty - 1)}
                    className={cn(
                      btnSize,
                      "border-input bg-background hover:bg-muted flex shrink-0 items-center justify-center rounded-md border disabled:cursor-not-allowed disabled:opacity-40",
                    )}
                  >
                    <Minus className="size-3.5" aria-hidden="true" />
                  </button>
                  <input
                    id={inputId}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={MAX_QUANTITY}
                    step={1}
                    value={qty}
                    aria-label={`${option.label} quantity`}
                    aria-invalid={invalid}
                    ref={ref}
                    onChange={(event) =>
                      setQuantity(
                        option.id,
                        parseQuantityInput(event.target.value),
                      )
                    }
                    onFocus={(event) => event.target.select()}
                    className={cn(
                      "border-input bg-background h-7 w-8 min-w-0 rounded-md border px-0 text-center text-sm tabular-nums outline-none",
                      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                      "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                      large && "h-8 w-10",
                    )}
                  />
                  <button
                    type="button"
                    data-slot="picture-choice-step"
                    data-direction="plus"
                    aria-label={`Add one ${option.label}`}
                    disabled={plusDisabled}
                    onClick={() => setQuantity(option.id, qty + 1)}
                    className={cn(
                      btnSize,
                      "border-input bg-background hover:bg-muted flex shrink-0 items-center justify-center rounded-md border disabled:cursor-not-allowed disabled:opacity-40",
                    )}
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          }

          const isOne = selection === "one";
          const selected = isOne
            ? selectedId === option.id
            : selectedIds.includes(option.id);
          const disabled = !isOne && !selected && atMax;
          return (
            <label
              key={option.id}
              htmlFor={inputId}
              data-slot="picture-choice-option"
              data-selected={selected ? "true" : "false"}
              data-kind={kind}
              className={cn(
                tileBaseClass,
                tileStateClass(selected),
                tileInteractiveClass,
              )}
            >
              <input
                id={inputId}
                type={isOne ? "radio" : "checkbox"}
                name={isOne ? fieldDomId : undefined}
                value={option.id}
                checked={selected}
                disabled={disabled}
                aria-invalid={invalid}
                ref={ref}
                className="sr-only"
                onChange={(event) => {
                  if (isOne) {
                    onChange(option.id);
                    return;
                  }
                  onChange(
                    event.target.checked
                      ? [...selectedIds, option.id]
                      : selectedIds.filter((id) => id !== option.id),
                  );
                }}
              />
              <SwatchVisual option={option} large={large} />
              <TileLabel
                option={option}
                showLabels={showLabels}
                large={large}
              />
              <CheckBadge selected={selected} />
            </label>
          );
        })}
      </div>

      {totalText && (
        <p
          data-slot="picture-choice-total"
          aria-live="polite"
          className="text-muted-foreground text-sm"
        >
          {totalText}
          {belowMin && minTotal != null && (
            <>
              {" "}
              ({selection === "quantity" ? "choose" : "pick"} at least{" "}
              {minTotal})
            </>
          )}
        </p>
      )}

      {selection === "one" && !field.required && selectedId && (
        <button
          type="button"
          data-slot="picture-choice-clear"
          onClick={() => onChange("")}
          className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-2"
        >
          Clear selection
        </button>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

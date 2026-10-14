"use client";

/* eslint-disable @next/next/no-img-element --
   Option / reference photos are owner-uploaded storage URLs on arbitrary
   hosts (not all covered by next.config `images.remotePatterns`), so a plain
   lazy <img> is used instead of next/image. */
import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Plus, Search, X } from "lucide-react";

import type {
  FormPictureChoiceField,
  FormPictureImageFit,
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
 * Two layouts:
 *
 * - **Legacy** (no `groups`, no option `family`, ≤ 24 tiles): one grid of
 *   every tile, exactly the DOM old forms have always had. The only additive
 *   change is a `picture-choice-code` line under a tile that has a `code`.
 * - **Browse** (any of those): group tabs, a "Color family" filter, a search
 *   box (> 24 tiles), a "Your picks" strip (many / quantity) and a polite
 *   status line. Only the active tab's tiles are rendered, so error focus
 *   goes to the fieldset (always mounted), never to a tile.
 *
 * DOM outline (hooks for template CSS):
 *
 *   fieldset[data-slot=picture-choice][data-selection][data-tile-size]
 *           [data-image-fit?][data-layout=browse (browse only)]
 *     legend
 *     p#…-description
 *     div[data-slot=picture-choice-reference] > img
 *     ── browse only ──
 *     div[data-slot=picture-choice-picks] (many / quantity)
 *       div[data-slot=picture-choice-picks-head]
 *         p[data-slot=picture-choice-picks-label] ("Your picks")
 *         p[data-slot=picture-choice-total]
 *           span[data-slot=picture-choice-limit] (after a blocked pick)
 *       ol[data-slot=picture-choice-picks-list]
 *         li[data-slot=picture-choice-pick][data-kind]
 *           span[data-slot=picture-choice-pick-swatch][data-kind] > img|span
 *           span[data-slot=picture-choice-pick-label]
 *           span[data-slot=picture-choice-pick-qty] ("× 2", quantity only)
 *           button[data-slot=picture-choice-pick-remove]
 *       p[data-slot=picture-choice-picks-empty]
 *     div[data-slot=picture-choice-tabs][role=tablist] (when groups)
 *       button[data-slot=picture-choice-tab][role=tab][aria-selected]
 *         span[data-slot=picture-choice-tab-count]
 *     div[data-slot=picture-choice-tools]
 *       div[data-slot=picture-choice-search] > svg + input (> 24 tiles)
 *       div[data-slot=picture-choice-families][role=radiogroup]
 *         button[data-slot=picture-choice-family][role=radio][aria-checked]
 *           span[data-slot=picture-choice-family-dot]
 *     div[data-slot=picture-choice-panel][role=tabpanel (when groups)]
 *       div[data-slot=picture-choice-results][role=radiogroup (one only)]
 *         div[data-slot=picture-choice-group] ("All" tab / search results)
 *           h3[data-slot=picture-choice-group-heading]
 *           p[data-slot=picture-choice-group-description]
 *           div[data-slot=picture-choice-grid] > tiles (as below)
 *       div[data-slot=picture-choice-empty] > p + button
 *     p[data-slot=picture-choice-status][aria-live=polite] (sr-only)
 *     ── both ──
 *     div[data-slot=picture-choice-grid][role=radiogroup (one only, legacy)]
 *       label|div[data-slot=picture-choice-option][data-selected][data-kind]
 *         input (sr-only radio/checkbox; quantity mode has no hidden input)
 *         span|button[data-slot=picture-choice-swatch][data-kind=image|color]
 *           img (image kind)
 *         span[data-slot=picture-choice-label]
 *         span[data-slot=picture-choice-code] ("#610", when the tile has one)
 *         span[data-slot=picture-choice-check] (selected badge)
 *         div[data-slot=picture-choice-stepper] (quantity only)
 *           button[data-slot=picture-choice-step][data-direction=minus]
 *           input[type=number]
 *           button[data-slot=picture-choice-step][data-direction=plus]
 *     p[data-slot=picture-choice-total][aria-live=polite] (legacy only)
 *     button[data-slot=picture-choice-clear] (one mode, optional, when picked)
 *     p.error
 *
 * At the max, the legacy layout disables unpicked tiles (native `disabled`,
 * as it always has); the browse layout marks them `aria-disabled` instead, so
 * they stay focusable and a click explains the limit.
 */

const MAX_QUANTITY = 999;

/** More tiles than this (or any group / family) switches to the browse layout. */
export const PICTURE_CHOICE_LEGACY_MAX_TILES = 24;

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

/** Whether a field needs the browse layout (tabs / filters / search / picks). */
export function usesPictureBrowseLayout(
  field: Pick<FormPictureChoiceField, "options" | "groups">,
): boolean {
  return (
    (field.groups?.length ?? 0) > 0 ||
    field.options.length > PICTURE_CHOICE_LEGACY_MAX_TILES ||
    field.options.some((option) => !!option.family)
  );
}

/** Search text → comparable form: trimmed, lower-case, no leading `#`. */
function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/^#+/, "").trim();
}

function matchesQuery(option: FormPictureOption, q: string): boolean {
  if (!q) return true;
  return (
    option.label.toLowerCase().includes(q) ||
    (!!option.code && option.code.toLowerCase().includes(q))
  );
}

// ─── Selection bookkeeping (shared by both layouts) ─────────────────────────

type SelectionState = {
  selectedId: string;
  selectedIds: string[];
  quantities: Record<string, number>;
  quantityTotal: number;
  /** Picks (many) or summed quantity (quantity); 0 in one mode. */
  count: number;
  totalText: string | null;
  belowMin: boolean;
  atMax: boolean;
};

function countText(
  field: FormPictureChoiceField,
  count: number,
): string | null {
  const maxTotal = field.maxTotal ?? null;
  if (field.selection === "quantity") {
    return maxTotal != null
      ? `${count} of ${maxTotal} chosen`
      : `${count} chosen`;
  }
  if (field.selection === "many") {
    return maxTotal != null
      ? `${count} of ${maxTotal} selected`
      : `${count} selected`;
  }
  return null;
}

function selectionState(
  field: FormPictureChoiceField,
  value: unknown,
): SelectionState {
  const { selection, options } = field;
  const minTotal = field.minTotal ?? null;
  const maxTotal = field.maxTotal ?? null;
  const selectedId = typeof value === "string" ? value : "";
  const selectedIds = asStringArray(value);
  const quantities = asQuantityRecord(value, options);
  const quantityTotal = Object.values(quantities).reduce((a, b) => a + b, 0);
  const count =
    selection === "quantity"
      ? quantityTotal
      : selection === "many"
        ? selectedIds.length
        : 0;
  return {
    selectedId,
    selectedIds,
    quantities,
    quantityTotal,
    count,
    totalText: countText(field, count),
    belowMin: selection !== "one" && minTotal != null && count < minTotal,
    atMax: maxTotal != null && selection !== "one" && count >= maxTotal,
  };
}

// ─── Tile pieces ────────────────────────────────────────────────────────────

const tileBaseClass =
  "relative flex min-w-0 flex-col items-center gap-1.5 rounded-lg border bg-background p-2 text-center transition-colors";

function tileStateClass(selected: boolean) {
  return selected
    ? "border-primary ring-primary bg-primary/5 ring-2"
    : "border-input";
}

const tileInteractiveClass =
  "cursor-pointer hover:bg-muted/50 has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50";

/** Browse layout: an `aria-disabled` (at-the-max) tile looks disabled too. */
const tileSoftLimitClass =
  "has-[input[aria-disabled=true]]:cursor-not-allowed has-[input[aria-disabled=true]]:opacity-50";

const stepButtonClass =
  "border-input bg-background hover:bg-muted flex shrink-0 items-center justify-center rounded-md border disabled:cursor-not-allowed disabled:opacity-40";

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
  fit,
  asButton,
  onPress,
  disabled,
  softDisabled,
}: {
  option: FormPictureOption;
  large: boolean;
  fit?: FormPictureImageFit;
  asButton?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Browse layout at the max: looks disabled, but a press still explains. */
  softDisabled?: boolean;
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
        // beside it (a balloon "Confetti" tile next to plain colors). With
        // `imageFit: "contain"` the whole (trimmed) photo shows uncropped.
        className={
          fit === "contain"
            ? cn(
                "object-contain drop-shadow-sm",
                large ? "aspect-square w-full" : "h-14 w-12",
              )
            : cn(
                "aspect-square object-cover",
                large ? "w-full rounded-lg" : "size-10 rounded-full",
              )
        }
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
        aria-disabled={softDisabled ? true : undefined}
        onClick={onPress}
        data-slot="picture-choice-swatch"
        data-kind={kind}
        className={cn(
          className,
          "disabled:cursor-not-allowed",
          softDisabled && "cursor-not-allowed opacity-60",
        )}
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

/** A tile's catalog code ("#610"), under the label; hidden with the label. */
function TileCode({
  option,
  showLabels,
}: {
  option: FormPictureOption;
  showLabels: boolean;
}) {
  if (!option.code) return null;
  const visible = tileKind(option) === "label" || showLabels;
  return (
    <span
      data-slot="picture-choice-code"
      className={cn(
        "text-muted-foreground -mt-1 text-[11px] leading-tight tabular-nums",
        !visible && "sr-only",
      )}
    >
      #{option.code}
    </span>
  );
}

type TileProps = {
  field: FormPictureChoiceField;
  option: FormPictureOption;
  fieldDomId: string;
  invalid: boolean;
  state: SelectionState;
  /** A one / many pick (or un-pick). */
  onPick: (option: FormPictureOption, checked: boolean) => void;
  /** A quantity change; `step` = the +/- buttons or a swatch tap. */
  onQuantity: (
    option: FormPictureOption,
    next: number,
    via: "step" | "input",
  ) => void;
  /**
   * Browse layout: at the max, mark tiles `aria-disabled` (still focusable,
   * the handlers explain) instead of natively `disabled`.
   */
  softLimit?: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
};

function PictureTile({
  field,
  option,
  fieldDomId,
  invalid,
  state,
  onPick,
  onQuantity,
  softLimit = false,
  inputRef,
}: TileProps) {
  const { selection, showLabels } = field;
  const large = field.tileSize === "large";
  const kind = tileKind(option);
  const inputId = `${fieldDomId}-${option.id}`;
  const { atMax } = state;

  if (selection === "quantity") {
    const qty = state.quantities[option.id] ?? 0;
    const selected = qty > 0;
    const plusDisabled = softLimit
      ? qty >= MAX_QUANTITY
      : qty >= MAX_QUANTITY || atMax;
    const plusSoftDisabled = softLimit && atMax && !plusDisabled;
    const btnSize = large ? "size-8" : "size-7";
    return (
      <div
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
          fit={field.imageFit}
          asButton
          disabled={plusDisabled}
          softDisabled={plusSoftDisabled}
          onPress={() => onQuantity(option, qty + 1, "step")}
        />
        <TileLabel option={option} showLabels={showLabels} large={large} />
        <TileCode option={option} showLabels={showLabels} />
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
            onClick={() => onQuantity(option, qty - 1, "step")}
            className={cn(btnSize, stepButtonClass)}
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
            ref={inputRef}
            onChange={(event) =>
              onQuantity(
                option,
                parseQuantityInput(event.target.value),
                "input",
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
            aria-disabled={plusSoftDisabled ? true : undefined}
            onClick={() => onQuantity(option, qty + 1, "step")}
            className={cn(
              btnSize,
              stepButtonClass,
              plusSoftDisabled && "cursor-not-allowed opacity-40",
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
    ? state.selectedId === option.id
    : state.selectedIds.includes(option.id);
  const limited = !isOne && !selected && atMax;
  return (
    <label
      htmlFor={inputId}
      data-slot="picture-choice-option"
      data-selected={selected ? "true" : "false"}
      data-kind={kind}
      className={cn(
        tileBaseClass,
        tileStateClass(selected),
        tileInteractiveClass,
        softLimit && tileSoftLimitClass,
      )}
    >
      <input
        id={inputId}
        type={isOne ? "radio" : "checkbox"}
        name={isOne ? fieldDomId : undefined}
        value={option.id}
        checked={selected}
        disabled={softLimit ? undefined : limited}
        aria-disabled={softLimit && limited ? true : undefined}
        aria-invalid={invalid}
        ref={inputRef}
        className="sr-only"
        onChange={(event) => onPick(option, event.target.checked)}
      />
      <SwatchVisual option={option} large={large} fit={field.imageFit} />
      <TileLabel option={option} showLabels={showLabels} large={large} />
      <TileCode option={option} showLabels={showLabels} />
      <CheckBadge selected={selected} />
    </label>
  );
}

function gridStyleFor(field: FormPictureChoiceField) {
  const large = field.tileSize === "large";
  const gridMin =
    field.selection === "quantity"
      ? large
        ? 150
        : 108
      : large
        ? 140
        : field.imageFit === "contain"
          ? 80
          : 72;
  return {
    gridTemplateColumns: `repeat(auto-fill, minmax(${gridMin}px, 1fr))`,
  };
}

function FieldHeader({
  field,
  legendId,
  descriptionId,
}: {
  field: FormPictureChoiceField;
  legendId: string;
  descriptionId: string | undefined;
}) {
  return (
    <>
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
    </>
  );
}

function FieldFooter({
  field,
  state,
  errorId,
  error,
  onChange,
}: {
  field: FormPictureChoiceField;
  state: SelectionState;
  errorId: string | undefined;
  error: string | undefined;
  onChange: (value: unknown) => void;
}) {
  return (
    <>
      {field.selection === "one" && !field.required && state.selectedId && (
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
    </>
  );
}

function MinHint({
  field,
  state,
}: {
  field: FormPictureChoiceField;
  state: SelectionState;
}) {
  const minTotal = field.minTotal ?? null;
  if (!state.belowMin || minTotal == null) return null;
  return (
    <>
      {" "}
      ({field.selection === "quantity" ? "choose" : "pick"} at least {minTotal})
    </>
  );
}

// ─── Entry point ────────────────────────────────────────────────────────────

export function PictureChoiceField(props: PictureChoiceFieldProps) {
  return usesPictureBrowseLayout(props.field) ? (
    <BrowsePictureChoice {...props} />
  ) : (
    <LegacyPictureChoice {...props} />
  );
}

// ─── Legacy layout: one grid, unchanged DOM ─────────────────────────────────

function LegacyPictureChoice({
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
  const { options, selection } = field;
  const invalid = !!error;
  const legendId = `${fieldDomId}-legend`;
  const state = selectionState(field, value);

  const onPick = (option: FormPictureOption, checked: boolean) => {
    if (selection === "one") {
      onChange(option.id);
      return;
    }
    onChange(
      checked
        ? [...state.selectedIds, option.id]
        : state.selectedIds.filter((id) => id !== option.id),
    );
  };

  const onQuantity = (option: FormPictureOption, next: number) => {
    const record = { ...state.quantities };
    if (next > 0) record[option.id] = next;
    else delete record[option.id];
    onChange(record);
  };

  return (
    <fieldset
      data-slot="picture-choice"
      data-selection={selection}
      data-tile-size={field.tileSize}
      data-image-fit={field.imageFit}
      aria-describedby={describedBy}
      className="min-w-0 space-y-2"
    >
      <FieldHeader
        field={field}
        legendId={legendId}
        descriptionId={descriptionId}
      />

      <div
        data-slot="picture-choice-grid"
        role={selection === "one" ? "radiogroup" : undefined}
        aria-labelledby={selection === "one" ? legendId : undefined}
        aria-required={
          selection === "one" ? field.required || undefined : undefined
        }
        className="grid gap-2"
        style={gridStyleFor(field)}
      >
        {options.map((option, index) => (
          <PictureTile
            key={option.id}
            field={field}
            option={option}
            fieldDomId={fieldDomId}
            invalid={invalid}
            state={state}
            onPick={onPick}
            onQuantity={onQuantity}
            inputRef={
              index === 0
                ? (el: HTMLInputElement | null) => registerRef(el)
                : undefined
            }
          />
        ))}
      </div>

      {state.totalText && (
        <p
          data-slot="picture-choice-total"
          aria-live="polite"
          className="text-muted-foreground text-sm"
        >
          {state.totalText}
          <MinHint field={field} state={state} />
        </p>
      )}

      <FieldFooter
        field={field}
        state={state}
        errorId={errorId}
        error={error}
        onChange={onChange}
      />
    </fieldset>
  );
}

// ─── Browse layout: tabs, families, search, picks ───────────────────────────

const TAB_ALL = "all";
const TAB_OTHER = "other";
/** Group tab keys are prefixed so a group id can never collide with all/other. */
const groupTabKey = (groupId: string) => `group:${groupId}`;
const PICKS_HEADING = Symbol("picks-heading");

type BrowseTab = {
  key: string;
  label: string;
  description?: string;
};

type PickEntry = { option: FormPictureOption; qty: number };

function PickSwatch({
  option,
  fit,
}: {
  option: FormPictureOption;
  fit: FormPictureImageFit | undefined;
}) {
  const kind = tileKind(option);
  if (kind === "label") return null;
  return (
    <span
      aria-hidden="true"
      data-slot="picture-choice-pick-swatch"
      data-kind={kind}
      className="flex size-7 shrink-0 items-center justify-center"
    >
      {kind === "image" ? (
        <img
          src={option.imageUrl ?? undefined}
          alt=""
          loading="lazy"
          decoding="async"
          className={
            fit === "contain"
              ? "h-7 w-6 object-contain"
              : "size-7 rounded-full object-cover"
          }
        />
      ) : (
        <span
          className="block size-6 rounded-full border border-black/10 forced-color-adjust-none"
          style={{ backgroundColor: option.color ?? undefined }}
        />
      )}
    </span>
  );
}

function BrowsePictureChoice({
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
  const { options, selection } = field;
  const invalid = !!error;
  const legendId = `${fieldDomId}-legend`;
  const panelId = `${fieldDomId}-panel`;
  const searchId = `${fieldDomId}-search`;
  const picksLabelId = `${fieldDomId}-picks-label`;
  const maxTotal = field.maxTotal ?? null;
  const state = selectionState(field, value);
  const showPicks = selection !== "one";
  const showSearch = options.length > PICTURE_CHOICE_LEGACY_MAX_TILES;
  const hasCodes = useMemo(() => options.some((o) => !!o.code), [options]);

  // ── groups → tabs ──
  const groups = field.groups;
  const groupIds = useMemo(
    () => new Set((groups ?? []).map((group) => group.id)),
    [groups],
  );
  const tabKeyOf = useCallback(
    (option: FormPictureOption) =>
      option.groupId && groupIds.has(option.groupId)
        ? groupTabKey(option.groupId)
        : TAB_OTHER,
    [groupIds],
  );
  const tabs = useMemo<BrowseTab[]>(() => {
    if (!groups || groups.length === 0) return [];
    const list: BrowseTab[] = [
      { key: TAB_ALL, label: "All" },
      ...groups.map((group) => ({
        key: groupTabKey(group.id),
        label: group.label,
        description: group.description,
      })),
    ];
    if (options.some((option) => tabKeyOf(option) === TAB_OTHER)) {
      list.push({ key: TAB_OTHER, label: "Other" });
    }
    return list;
  }, [groups, options, tabKeyOf]);
  const hasTabs = tabs.length > 0;

  // ── view state ──
  const [tabChoice, setTabChoice] = useState<string>(TAB_ALL);
  const [familyChoice, setFamilyChoice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  /** The pick count at which a blocked pick last happened ("remove one" hint). */
  const [limitNudgeAt, setLimitNudgeAt] = useState<number | null>(null);
  /** The tab to go back to when a search (which jumps to "All") is cleared. */
  const tabBeforeSearch = useRef<string | null>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const familyRefs = useRef(new Map<string, HTMLButtonElement>());
  const removeRefs = useRef(new Map<string, HTMLButtonElement>());
  const picksLabelRef = useRef<HTMLParagraphElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const pendingFocus = useRef<string | typeof PICKS_HEADING | null>(null);

  const activeTab = tabs.some((tab) => tab.key === tabChoice)
    ? tabChoice
    : TAB_ALL;
  const activeTabIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === activeTab),
  );
  const q = normalizeQuery(query);

  const announce = useCallback((message: string) => {
    // A repeat of the same text wouldn't be re-read; nudge it with a NBSP.
    setStatus((prev) => (prev === message ? `${message} ` : message));
  }, []);

  // ── filtering (memoized: ~100+ tiles) ──
  const tabOptions = useMemo(
    () =>
      !hasTabs || activeTab === TAB_ALL
        ? options
        : options.filter((option) => tabKeyOf(option) === activeTab),
    [activeTab, hasTabs, options, tabKeyOf],
  );

  const familyInfo = useMemo(() => {
    const families: string[] = [];
    const dots = new Map<string, string>();
    let anyWithout = false;
    for (const option of tabOptions) {
      const family = option.family;
      if (!family) {
        anyWithout = true;
        continue;
      }
      if (!families.includes(family)) families.push(family);
      if (!dots.has(family) && option.color) dots.set(family, option.color);
    }
    return { families, dots, anyWithout };
  }, [tabOptions]);
  const showFamilies =
    familyInfo.families.length >= 2 ||
    (familyInfo.families.length === 1 && familyInfo.anyWithout);
  const family =
    showFamilies &&
    familyChoice != null &&
    familyInfo.families.includes(familyChoice)
      ? familyChoice
      : null;

  const results = useMemo(
    () =>
      tabOptions.filter(
        (option) =>
          (family == null || option.family === family) &&
          matchesQuery(option, q),
      ),
    [family, q, tabOptions],
  );

  /** "All" tab (or a search): results under a heading per group. */
  const sections = useMemo(() => {
    if (!hasTabs || activeTab !== TAB_ALL) return null;
    const byTab = new Map<string, FormPictureOption[]>();
    for (const option of results) {
      const key = tabKeyOf(option);
      const list = byTab.get(key);
      if (list) list.push(option);
      else byTab.set(key, [option]);
    }
    return tabs
      .filter((tab) => tab.key !== TAB_ALL && byTab.has(tab.key))
      .map((tab) => ({ tab, options: byTab.get(tab.key)! }));
  }, [activeTab, hasTabs, results, tabKeyOf, tabs]);

  // ── picks ──
  const optionById = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );
  const picks: PickEntry[] =
    selection === "many"
      ? state.selectedIds.flatMap((id) => {
          const option = optionById.get(id);
          return option ? [{ option, qty: 1 }] : [];
        })
      : selection === "quantity"
        ? options.flatMap((option) => {
            const qty = state.quantities[option.id];
            return qty ? [{ option, qty }] : [];
          })
        : [];

  const tabCounts = new Map<string, number>();
  if (hasTabs) {
    const bump = (option: FormPictureOption | undefined, n: number) => {
      if (!option || n <= 0) return;
      const key = tabKeyOf(option);
      tabCounts.set(key, (tabCounts.get(key) ?? 0) + n);
      tabCounts.set(TAB_ALL, (tabCounts.get(TAB_ALL) ?? 0) + n);
    };
    if (selection === "one") bump(optionById.get(state.selectedId), 1);
    else for (const pick of picks) bump(pick.option, pick.qty);
  }

  // Focus after removing a chip: the next chip, else the previous, else the
  // "Your picks" heading (the removed button is gone).
  useEffect(() => {
    const target = pendingFocus.current;
    if (target == null) return;
    pendingFocus.current = null;
    if (target === PICKS_HEADING) picksLabelRef.current?.focus();
    else removeRefs.current.get(target)?.focus();
  }, [value]);

  // Tell screen readers how many tiles a search left (debounced).
  useEffect(() => {
    if (!q) return;
    const n = results.length;
    const timer = window.setTimeout(() => {
      announce(n === 0 ? "No matches" : n === 1 ? "1 match" : `${n} matches`);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [announce, q, results.length]);

  // ── handlers ──
  const announceBlocked = (option: FormPictureOption) => {
    setLimitNudgeAt(state.count);
    announce(
      selection === "quantity"
        ? `You can choose up to ${maxTotal} in total. Remove one to add ${option.label}.`
        : `You can pick up to ${maxTotal}. Remove one to add ${option.label}.`,
    );
  };

  const onPick = (option: FormPictureOption, checked: boolean) => {
    if (selection === "one") {
      onChange(option.id);
      return;
    }
    const has = state.selectedIds.includes(option.id);
    if (checked) {
      if (has) return;
      if (state.atMax) {
        announceBlocked(option);
        return;
      }
      const next = [...state.selectedIds, option.id];
      onChange(next);
      announce(`${option.label} added. ${countText(field, next.length)}.`);
      return;
    }
    if (!has) return;
    const next = state.selectedIds.filter((id) => id !== option.id);
    onChange(next);
    announce(`${option.label} removed. ${countText(field, next.length)}.`);
  };

  const onQuantity = (
    option: FormPictureOption,
    next: number,
    via: "step" | "input",
  ) => {
    const current = state.quantities[option.id] ?? 0;
    if (via === "step" && next > current && state.atMax) {
      announceBlocked(option);
      return;
    }
    const record = { ...state.quantities };
    if (next > 0) record[option.id] = next;
    else delete record[option.id];
    onChange(record);
    if (via === "step") {
      const total = state.quantityTotal - current + Math.max(0, next);
      announce(
        `${option.label}: ${Math.max(0, next)}. ${countText(field, total)}.`,
      );
    }
  };

  const removePick = (index: number) => {
    const pick = picks[index];
    if (!pick) return;
    const neighbour = picks[index + 1] ?? picks[index - 1];
    pendingFocus.current = neighbour ? neighbour.option.id : PICKS_HEADING;
    let remaining: number;
    if (selection === "quantity") {
      const record = { ...state.quantities };
      delete record[pick.option.id];
      onChange(record);
      remaining = state.quantityTotal - pick.qty;
    } else {
      const next = state.selectedIds.filter((id) => id !== pick.option.id);
      onChange(next);
      remaining = next.length;
    }
    announce(`${pick.option.label} removed. ${countText(field, remaining)}.`);
  };

  const selectTab = (key: string, focus = false) => {
    setTabChoice(key);
    setFamilyChoice(null);
    tabBeforeSearch.current = null;
    if (focus) tabRefs.current.get(key)?.focus();
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const n = tabs.length;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = (activeTabIndex + 1) % n;
    else if (event.key === "ArrowLeft") next = (activeTabIndex - 1 + n) % n;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = n - 1;
    if (next == null) return;
    event.preventDefault();
    selectTab(tabs[next]!.key, true);
  };

  const familyItems: (string | null)[] = [null, ...familyInfo.families];
  const familyKey = (item: string | null) => item ?? "";
  const selectFamily = (item: string | null, focus = false) => {
    setFamilyChoice(item);
    if (focus) familyRefs.current.get(familyKey(item))?.focus();
  };
  const onFamilyKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const n = familyItems.length;
    const current = Math.max(0, familyItems.indexOf(family));
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (current + 1) % n;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (current - 1 + n) % n;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = n - 1;
    if (next == null) return;
    event.preventDefault();
    selectFamily(familyItems[next]!, true);
  };

  const onQueryChange = (nextRaw: string) => {
    const had = q !== "";
    const has = normalizeQuery(nextRaw) !== "";
    // A search looks across every group: jump to "All", and come back to
    // the tab the visitor was on once the box is cleared.
    if (!had && has && hasTabs && activeTab !== TAB_ALL) {
      tabBeforeSearch.current = activeTab;
      setTabChoice(TAB_ALL);
    } else if (had && !has && tabBeforeSearch.current) {
      setTabChoice(tabBeforeSearch.current);
      setFamilyChoice(null);
      tabBeforeSearch.current = null;
    }
    setQuery(nextRaw);
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Inside a live <form>: Enter must never submit it.
    if (event.key === "Enter") {
      event.preventDefault();
      return;
    }
    if (event.key === "Escape" && query !== "") {
      event.preventDefault();
      onQueryChange("");
    }
  };

  const clearFilters = () => {
    setQuery("");
    setFamilyChoice(null);
    setTabChoice(TAB_ALL);
    tabBeforeSearch.current = null;
    if (searchRef.current) searchRef.current.focus();
    else tabRefs.current.get(TAB_ALL)?.focus();
    announce("Search and filters cleared");
  };

  // ── rendering helpers ──
  const gridStyle = gridStyleFor(field);
  const renderGrid = (list: FormPictureOption[], labelledBy?: string) => (
    <div
      data-slot="picture-choice-grid"
      role={selection !== "one" && labelledBy ? "group" : undefined}
      aria-labelledby={selection !== "one" ? labelledBy : undefined}
      className="grid gap-2"
      style={gridStyle}
    >
      {list.map((option) => (
        <PictureTile
          key={option.id}
          field={field}
          option={option}
          fieldDomId={fieldDomId}
          invalid={invalid}
          state={state}
          onPick={onPick}
          onQuantity={onQuantity}
          softLimit
        />
      ))}
    </div>
  );

  const activeTabMeta = tabs[activeTabIndex];
  const emptyScope = [
    hasTabs && activeTab !== TAB_ALL ? activeTabMeta?.label : null,
    family,
  ]
    .filter(Boolean)
    .join(" · ");
  const emptyText = q
    ? `No matches for “${query.trim()}”${emptyScope ? ` in ${emptyScope}` : ""}.`
    : `Nothing matches${emptyScope ? ` ${emptyScope}` : " these filters"}.`;

  return (
    <fieldset
      ref={registerRef}
      tabIndex={-1}
      data-slot="picture-choice"
      data-selection={selection}
      data-tile-size={field.tileSize}
      data-image-fit={field.imageFit}
      data-layout="browse"
      aria-describedby={describedBy}
      className="min-w-0 space-y-3 outline-none"
    >
      <FieldHeader
        field={field}
        legendId={legendId}
        descriptionId={descriptionId}
      />

      {showPicks && (
        <div
          data-slot="picture-choice-picks"
          data-full={state.atMax ? "true" : undefined}
          className="bg-muted/30 border-input space-y-2 rounded-lg border border-dashed p-3"
        >
          <div
            data-slot="picture-choice-picks-head"
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
          >
            <p
              id={picksLabelId}
              ref={picksLabelRef}
              tabIndex={-1}
              data-slot="picture-choice-picks-label"
              className="text-sm font-medium outline-none"
            >
              Your picks
            </p>
            <p
              data-slot="picture-choice-total"
              className="text-muted-foreground text-sm tabular-nums"
            >
              {state.totalText}
              <MinHint field={field} state={state} />
              {state.atMax && limitNudgeAt === state.count && (
                <span data-slot="picture-choice-limit">
                  {" "}
                  · Remove one to add another
                </span>
              )}
            </p>
          </div>
          {picks.length > 0 ? (
            <ol
              data-slot="picture-choice-picks-list"
              aria-labelledby={picksLabelId}
              className="flex flex-wrap gap-2"
            >
              {picks.map((pick, index) => (
                <li
                  key={pick.option.id}
                  data-slot="picture-choice-pick"
                  data-kind={tileKind(pick.option)}
                  className="bg-background border-input inline-flex min-h-9 items-center gap-1.5 rounded-full border py-0.5 pr-0.5 pl-1.5 text-sm"
                >
                  <PickSwatch option={pick.option} fit={field.imageFit} />
                  <span
                    data-slot="picture-choice-pick-label"
                    className={cn(
                      "leading-tight",
                      tileKind(pick.option) === "label" && "pl-1.5",
                    )}
                  >
                    {pick.option.label}
                  </span>
                  {selection === "quantity" && (
                    <span
                      data-slot="picture-choice-pick-qty"
                      className="text-muted-foreground tabular-nums"
                    >
                      × {pick.qty}
                    </span>
                  )}
                  <button
                    type="button"
                    data-slot="picture-choice-pick-remove"
                    aria-label={`Remove ${pick.option.label}`}
                    ref={(el) => {
                      if (el) removeRefs.current.set(pick.option.id, el);
                      else removeRefs.current.delete(pick.option.id);
                    }}
                    onClick={() => removePick(index)}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-ring flex size-8 shrink-0 items-center justify-center rounded-full focus-visible:outline-2"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p
              data-slot="picture-choice-picks-empty"
              className="text-muted-foreground text-sm"
            >
              Nothing picked yet.
            </p>
          )}
        </div>
      )}

      {hasTabs && (
        <div
          role="tablist"
          aria-label={`Browse ${field.label} by group`}
          data-slot="picture-choice-tabs"
          className="no-scrollbar border-input flex gap-1 overflow-x-auto border-b"
        >
          {tabs.map((tab, index) => {
            const selected = tab.key === activeTab;
            const count = tabCounts.get(tab.key) ?? 0;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={`${fieldDomId}-tab-${index}`}
                aria-selected={selected}
                aria-label={
                  count > 0 ? `${tab.label}, ${count} picked` : undefined
                }
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                data-slot="picture-choice-tab"
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.key, el);
                  else tabRefs.current.delete(tab.key);
                }}
                onClick={() => selectTab(tab.key)}
                onKeyDown={onTabKeyDown}
                className={cn(
                  "focus-visible:outline-ring -mb-px inline-flex shrink-0 items-baseline gap-1 border-b-2 px-3 py-2 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2",
                  selected
                    ? "border-primary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    aria-hidden="true"
                    data-slot="picture-choice-tab-count"
                    className="text-xs tabular-nums"
                  >
                    · {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {(showSearch || showFamilies) && (
        <div data-slot="picture-choice-tools" className="space-y-2">
          {showSearch && (
            <div data-slot="picture-choice-search" className="relative">
              <label htmlFor={searchId} className="sr-only">
                Search {field.label}
              </label>
              <Search
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              />
              <input
                id={searchId}
                ref={searchRef}
                type="search"
                value={query}
                autoComplete="off"
                enterKeyHint="search"
                aria-controls={panelId}
                placeholder={
                  hasCodes ? "Search by name or #code" : "Search by name"
                }
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={onSearchKeyDown}
                data-slot="picture-choice-search-input"
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full min-w-0 rounded-md border pr-3 pl-9 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm"
              />
            </div>
          )}
          {showFamilies && (
            <div
              role="radiogroup"
              aria-label="Color family"
              data-slot="picture-choice-families"
              className="flex flex-wrap gap-1.5"
            >
              {familyItems.map((item) => {
                const checked = item === family;
                const dot = item ? familyInfo.dots.get(item) : undefined;
                return (
                  <button
                    key={familyKey(item)}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    tabIndex={checked ? 0 : -1}
                    data-slot="picture-choice-family"
                    ref={(el) => {
                      if (el) familyRefs.current.set(familyKey(item), el);
                      else familyRefs.current.delete(familyKey(item));
                    }}
                    onClick={() => selectFamily(item)}
                    onKeyDown={onFamilyKeyDown}
                    className={cn(
                      "focus-visible:outline-ring inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-muted",
                    )}
                  >
                    {dot && (
                      <span
                        aria-hidden="true"
                        data-slot="picture-choice-family-dot"
                        className="block size-2.5 rounded-full border border-black/10 forced-color-adjust-none"
                        style={{ backgroundColor: dot }}
                      />
                    )}
                    {item ?? "All"}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div
        id={panelId}
        role={hasTabs ? "tabpanel" : undefined}
        aria-labelledby={
          hasTabs ? `${fieldDomId}-tab-${activeTabIndex}` : undefined
        }
        data-slot="picture-choice-panel"
      >
        {results.length > 0 ? (
          <div
            data-slot="picture-choice-results"
            role={selection === "one" ? "radiogroup" : undefined}
            aria-labelledby={selection === "one" ? legendId : undefined}
            aria-required={
              selection === "one" ? field.required || undefined : undefined
            }
            className="-mx-1 max-h-[32rem] space-y-4 overflow-y-auto overscroll-contain px-1 py-1"
          >
            {sections ? (
              sections.map(({ tab, options: list }, index) => {
                const headingId = `${fieldDomId}-group-${index}`;
                return (
                  <div
                    key={tab.key}
                    data-slot="picture-choice-group"
                    className="space-y-2"
                  >
                    <h3
                      id={headingId}
                      data-slot="picture-choice-group-heading"
                      className="text-sm font-semibold"
                    >
                      {tab.label}
                    </h3>
                    {tab.description && (
                      <p
                        data-slot="picture-choice-group-description"
                        className="text-muted-foreground -mt-1 text-xs"
                      >
                        {tab.description}
                      </p>
                    )}
                    {renderGrid(list, headingId)}
                  </div>
                );
              })
            ) : (
              <>
                {activeTabMeta?.description && (
                  <p
                    data-slot="picture-choice-group-description"
                    className="text-muted-foreground mb-2 text-xs"
                  >
                    {activeTabMeta.description}
                  </p>
                )}
                {renderGrid(results)}
              </>
            )}
          </div>
        ) : (
          <div
            data-slot="picture-choice-empty"
            className="bg-muted/30 flex flex-col items-center gap-3 rounded-lg px-4 py-8 text-center text-sm"
          >
            <p className="text-muted-foreground">{emptyText}</p>
            <button
              type="button"
              data-slot="picture-choice-empty-clear"
              onClick={clearFilters}
              className="border-input bg-background hover:bg-muted focus-visible:outline-ring rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Clear search and filters
            </button>
          </div>
        )}
      </div>

      <p
        data-slot="picture-choice-status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {status}
      </p>

      <FieldFooter
        field={field}
        state={state}
        errorId={errorId}
        error={error}
        onChange={onChange}
      />
    </fieldset>
  );
}

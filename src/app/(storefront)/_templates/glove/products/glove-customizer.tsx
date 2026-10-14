"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { GloveAddOnCopy } from "./glove-addon-picker";
import type { ChipItem } from "./glove-chip-row";
import type { ProductCustomizerController } from "~/components/customizer";
import type { PublicCustomizerGroup } from "~/lib/customizer";
import { customizerTextLength, textLimit } from "~/lib/customizer";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";

import { gloveBuildTotalParts, pickLineLabel } from "./glove-build-total";
import { ChipRow } from "./glove-chip-row";
import { GloveOptionLabel } from "./glove-variant-selector";

/** Marks a group's wrapper, so a failed add can find the first invalid one. */
const GROUP_ATTR = { "data-glove-option-group": "" };

type Props = {
  controller: ProductCustomizerController;
  /** Glove line amount (unit price x quantity) for the running total. */
  gloveAmount: number;
  quantity: number;
  copy: GloveAddOnCopy;
  sectionAttrs?: Record<string, string>;
  /**
   * Step number of the first group shown here, or null for no medallions
   * (a product that is not a made-to-order glove). Later groups count up.
   */
  firstStep: number | null;
};

/**
 * "Complete your LuvGluv" over the product customizer: the glove-styled
 * face of `useProductCustomizer`. Same chips as the legacy add-on picker -
 * a horizontal track of 56px image chips with the purple ring, a check and
 * the one-shot swing (signature 2) - but the rows are the owner's option
 * groups, not two hard-wired collections:
 *
 * - a single-pick group is a radio row; when it is optional it starts with a
 *   "No chain" chip, which clears the group
 * - a multi-pick group is a checkbox row with an "N of max" count; chips past
 *   the limit turn inert; "first N included" picks read "Included"
 * - a text group (engraving) is a glove input with a character counter
 *
 * Prices are the controller's preview (the server re-prices). The itemised
 * total under the rows is the one polite live region for the total; it
 * stays mounted so the first announcement is not lost.
 */
export function GloveCustomizer({
  controller,
  gloveAmount,
  quantity,
  copy,
  sectionAttrs,
  firstStep,
}: Props) {
  const headingId = useId();
  const rootRef = useRef<HTMLElement | null>(null);
  const [swingId, setSwingId] = useState<string | null>(null);
  const { definition, attempt } = controller;

  // After a failed add, take the shopper to the first group with a problem.
  useEffect(() => {
    if (attempt === 0) return;
    const group = rootRef.current?.querySelector<HTMLElement>(
      "[data-glove-option-group][data-invalid='true']",
    );
    const target =
      group?.querySelector<HTMLElement>('[tabindex="0"], input') ??
      group?.querySelector<HTMLElement>(
        "button:not([aria-disabled='true']), input",
      );
    target?.focus();
  }, [attempt]);

  if (!definition) return null;

  const groups = definition.groups.filter(
    (group) => group.kind === "text" || group.values.length > 0,
  );
  const groupById = new Map(groups.map((group) => [group.id, group]));

  const { selectedValues, selectedTexts } = controller;
  const hasSelection = selectedValues.length > 0 || selectedTexts.length > 0;
  const total = controller.unitPrice * quantity;
  const parts = gloveBuildTotalParts({
    gloveLine: copy.gloveLine,
    gloveAmount,
    quantity,
    values: selectedValues,
    texts: selectedTexts,
    lineLabel: (groupId, groupName) =>
      pickLineLabel(
        groupName,
        (groupById.get(groupId)?.maxSelections ?? 1) > 1,
        copy,
      ),
  });

  return (
    <section
      ref={rootRef}
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
        {groups.map((group, index) => {
          const step = firstStep === null ? null : firstStep + index;
          return group.kind === "text" ? (
            <TextRow
              key={group.id}
              group={group}
              controller={controller}
              step={step}
            />
          ) : (
            <ChoiceRow
              key={group.id}
              group={group}
              controller={controller}
              step={step}
              copy={copy}
              swingId={swingId}
              setSwingId={setSwingId}
            />
          );
        })}
      </div>

      <p
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          "glove-body m-0 text-[14px] text-[var(--glove-text)]",
          hasSelection && "mt-4 border-t border-[var(--glove-mist-line)] pt-3",
        )}
      >
        {hasSelection ? (
          <>
            {parts.join(" · ")}
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

/** What an optional single-pick group calls "nothing": "No chain". */
function noneLabel(group: PublicCustomizerGroup, copy: GloveAddOnCopy) {
  const name = group.name.trim();
  if (copy.noChainLabel && name.toLowerCase() === copy.chainLabel.toLowerCase())
    return copy.noChainLabel;
  return `No ${name.toLowerCase()}`;
}

function ChoiceRow({
  group,
  controller,
  step,
  copy,
  swingId,
  setSwingId,
}: {
  group: PublicCustomizerGroup;
  controller: ProductCustomizerController;
  step: number | null;
  copy: GloveAddOnCopy;
  swingId: string | null;
  setSwingId: (id: string | null) => void;
}) {
  const single = group.maxSelections <= 1;
  const clearable = single && !group.required;
  const noneId = `__none__:${group.id}`;
  const picked = group.values.filter((v) =>
    controller.isSelected(group.id, v.id),
  );
  const atLimit = !single && picked.length >= group.maxSelections;
  const errors = controller.groupErrors[group.id] ?? [];

  const items: ChipItem[] = [
    ...(clearable
      ? [
          {
            id: noneId,
            name: noneLabel(group, copy),
            imageUrl: null,
            price: null,
            available: true,
          },
        ]
      : []),
    ...group.values.map((value) => {
      const selected = controller.isSelected(group.id, value.id);
      return {
        id: value.id,
        name: value.label,
        imageUrl: value.imageUrl,
        swatchColor: value.swatchColor,
        price: value.price > 0 ? value.price : null,
        // A chosen value that has since sold out can still be removed.
        available: value.available || selected,
        blocked: atLimit && !selected,
        included: selected && controller.includedValueIds.has(value.id),
        unoptimized: true,
      };
    }),
  ];

  const onPick = (id: string) => {
    if (id === noneId) {
      controller.clearGroup(group.id);
      return;
    }
    const wasSelected = controller.isSelected(group.id, id);
    if (single) controller.selectValue(group.id, id);
    else controller.toggleValue(group.id, id);
    if (!wasSelected) setSwingId(id);
  };

  const selectedLabel = single
    ? (picked[0]?.label ?? (clearable ? noneLabel(group, copy) : null))
    : picked.length > 0
      ? `${picked.length} of ${group.maxSelections}`
      : null;

  const note = !single
    ? [
        `Up to ${group.maxSelections}`,
        group.includedCount > 0 ? `${group.includedCount} included` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <ChipRow
      mode={single ? "single" : "multi"}
      label={group.name}
      step={step}
      selectedLabel={selectedLabel}
      required={group.required}
      extra={
        note ? (
          <span className="text-[13px] text-[var(--glove-muted)]">{note}</span>
        ) : null
      }
      help={group.helpText}
      error={errors.length > 0 ? errors.join(". ") : null}
      groupAttrs={GROUP_ATTR}
      items={items}
      isSelected={(id) =>
        id === noneId
          ? picked.length === 0
          : controller.isSelected(group.id, id)
      }
      onPick={onPick}
      swingId={swingId}
      onSwingEnd={() => setSwingId(null)}
    />
  );
}

/** A text option (engraving): a glove input with a live character count. */
function TextRow({
  group,
  controller,
  step,
}: {
  group: PublicCustomizerGroup;
  controller: ProductCustomizerController;
  step: number | null;
}) {
  const id = useId();
  const helpId = `${id}-help`;
  const counterId = `${id}-counter`;
  const errorId = `${id}-error`;
  const limit = textLimit(group);
  const text = controller.getText(group.id);
  const length = customizerTextLength(text);
  const errors = controller.groupErrors[group.id] ?? [];
  const invalid = errors.length > 0;
  const describedBy = [
    group.helpText ? helpId : null,
    counterId,
    invalid ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="flex min-w-0 flex-col gap-2"
      data-invalid={invalid ? "true" : undefined}
      {...GROUP_ATTR}
    >
      <GloveOptionLabel
        label={group.name}
        step={step}
        htmlFor={`${id}-input`}
        extra={
          <>
            {group.required ? (
              <span className="text-[13px] text-[var(--glove-muted)]">
                Required
              </span>
            ) : null}
            {group.textPriceCents > 0 ? (
              <span className="text-[13px] text-[var(--glove-muted)]">
                +{formatPrice(group.textPriceCents)}
              </span>
            ) : null}
          </>
        }
      />
      {group.helpText ? (
        <p
          id={helpId}
          className="m-0 text-[13px] leading-snug text-[var(--glove-muted)]"
        >
          {group.helpText}
        </p>
      ) : null}
      <input
        id={`${id}-input`}
        type="text"
        value={text}
        maxLength={limit}
        placeholder={group.placeholder ?? undefined}
        autoComplete="off"
        aria-required={group.required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => controller.setText(group.id, event.target.value)}
        className="glove-input"
      />
      <span
        id={counterId}
        className="self-end text-[13px] text-[var(--glove-muted)] tabular-nums"
      >
        {length} / {limit}
        <span className="sr-only"> characters</span>
      </span>
      {invalid ? (
        <p id={errorId} role="alert" className="glove-error m-0">
          {errors.join(". ")}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useId, useState } from "react";

import type { GloveAddOn } from "./glove-addons";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";

import { ChipRow } from "./glove-chip-row";
import { gloveConfiguredTotal } from "./glove-total";

/**
 * LEGACY add-on picker: chains and charms come from two collections and are
 * added as separate `addOnFor` cart lines. Used only for products without a
 * `product.customizer` (see `GloveCustomizer`). TODO: retire with
 * `glove-addons.ts`, `glove-total.ts` and the collection-slug fields once
 * every store has migrated (Phase 6 of the product-customizer plan,
 * ~/.claude/plans/i-need-to-add-noble-volcano.md; scripts/glove/migrate-addons-to-options.ts).
 */

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

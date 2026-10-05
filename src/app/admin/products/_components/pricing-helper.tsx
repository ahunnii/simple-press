"use client";

import type { FormVariant } from "../_validators/schema";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

// Stripe's standard US card rate. An estimate only; the owner's real rate
// can differ (international cards, negotiated pricing, etc.).
export const CARD_FEE_PERCENT = 0.029;
export const CARD_FEE_FIXED_CENTS = 30;

export const MARGIN_TARGETS: { pct: number; note?: string }[] = [
  { pct: 40 },
  { pct: 50, note: "2× cost" },
  { pct: 60 },
  { pct: 70 },
];

// How close (in margin points) the current margin must be to a target for
// that suggestion chip to read as "selected".
const SELECTED_TOLERANCE_PTS = 2;

/** Estimated card processing fee for one sale, in cents. */
export function estCardFeeCents(priceCents: number): number {
  if (priceCents <= 0) return 0;
  return Math.round(priceCents * CARD_FEE_PERCENT) + CARD_FEE_FIXED_CENTS;
}

/** Gross margin as a rounded integer percent, or null when not computable. */
export function grossMarginPct(
  priceCents: number,
  costCents: number | null | undefined,
): number | null {
  if (priceCents <= 0 || costCents == null || costCents <= 0) return null;
  return Math.round(((priceCents - costCents) / priceCents) * 100);
}

/** Lowest price (cents) that still meets the margin target; rounds UP. */
export function priceForMarginCents(
  costCents: number,
  marginFraction: number,
): number {
  return Math.ceil(costCents / (1 - marginFraction));
}

export function splitFor(priceCents: number, costCents: number) {
  const feeCents = estCardFeeCents(priceCents);
  const profitCents = priceCents - costCents - feeCents;
  return { costCents, feeCents, profitCents, isLoss: profitCents <= 0 };
}

export function marginRange(
  costCents: number | null | undefined,
  priceCentsList: number[],
): { min: number; max: number } | null {
  let min: number | null = null;
  let max: number | null = null;
  for (const price of priceCentsList) {
    const m = grossMarginPct(price, costCents);
    if (m === null) continue;
    if (min === null || m < min) min = m;
    if (max === null || m > max) max = m;
  }
  return min === null || max === null ? null : { min, max };
}

/**
 * Each variant's sell price in cents. Variants without their own price fall
 * back to the base price (dollars); anything not positive is dropped.
 */
export function effectiveVariantPricesCents(
  variants: Pick<FormVariant, "price">[],
  basePriceDollars: number | null | undefined,
): number[] {
  const baseCents =
    typeof basePriceDollars === "number" && basePriceDollars > 0
      ? Math.round(basePriceDollars * 100)
      : null;
  const prices: number[] = [];
  for (const v of variants) {
    const cents = typeof v.price === "number" ? v.price : baseCents;
    if (cents != null && cents > 0) prices.push(cents);
  }
  return prices;
}

export function formatMarginRange(
  range: { min: number; max: number } | null,
): string | null {
  if (!range) return null;
  return range.min === range.max
    ? `${range.min}%`
    : `${range.min}%–${range.max}%`;
}

const chipClass =
  "flex flex-col items-start rounded-md border px-3 py-1.5 tabular-nums";

type PricingHelperProps = {
  priceDollars: number | null | undefined;
  costDollars: number | null | undefined;
  variantPricesCents: number[];
  onApplyPrice?: (dollars: number) => void;
};

export function PricingHelper({
  priceDollars,
  costDollars,
  variantPricesCents,
  onApplyPrice,
}: PricingHelperProps) {
  if (typeof costDollars !== "number" || !(costDollars > 0)) return null;

  const costCents = Math.round(costDollars * 100);
  const variantMode = variantPricesCents.length > 0;
  const priceCents =
    typeof priceDollars === "number" && priceDollars > 0
      ? Math.round(priceDollars * 100)
      : 0;
  const interactive = !variantMode && !!onApplyPrice;
  const currentMargin = variantMode
    ? null
    : grossMarginPct(priceCents, costCents);

  // The target closest to the current margin, if it's within tolerance.
  const selectedPct =
    currentMargin === null
      ? null
      : MARGIN_TARGETS.reduce<{ pct: number; diff: number } | null>(
          (best, t) => {
            const diff = Math.abs(t.pct - currentMargin);
            return best === null || diff < best.diff
              ? { pct: t.pct, diff }
              : best;
          },
          null,
        );
  const selectedTarget =
    selectedPct && selectedPct.diff <= SELECTED_TOLERANCE_PTS
      ? selectedPct.pct
      : null;

  return (
    <div className="space-y-3 pt-1">
      {variantMode ? (
        <VariantSummary costCents={costCents} prices={variantPricesCents} />
      ) : priceCents > 0 ? (
        <SingleBreakdown priceCents={priceCents} costCents={costCents} />
      ) : (
        <p className="text-muted-foreground text-sm">
          Set a price to see your profit.
        </p>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-medium">Suggested prices by margin</p>
        <div className="grid grid-cols-2 gap-2">
          {MARGIN_TARGETS.map(({ pct, note }) => {
            const suggestedCents = priceForMarginCents(costCents, pct / 100);
            const content = (
              <>
                <span className="text-sm font-medium">
                  {formatPrice(suggestedCents)}
                </span>
                <span className="text-muted-foreground text-xs font-normal">
                  {pct}%{note && ` · ${note}`}
                </span>
              </>
            );

            if (!interactive) {
              return (
                <span
                  key={pct}
                  className={cn(chipClass, "text-foreground bg-muted/40")}
                >
                  {content}
                </span>
              );
            }

            const selected = selectedTarget === pct;
            return (
              <Button
                key={pct}
                type="button"
                size="sm"
                variant="outline"
                aria-pressed={selected}
                className={cn(
                  "h-auto flex-col items-start gap-0 py-1.5 tabular-nums",
                  selected && "border-primary bg-primary/5",
                )}
                onClick={() => onApplyPrice?.(suggestedCents / 100)}
              >
                {content}
              </Button>
            );
          })}
        </div>
        {!interactive && (
          <p className="text-muted-foreground text-xs">
            For reference — set prices per variant below.
          </p>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        Card fee estimate uses Stripe&apos;s standard 2.9% + 30¢. Your actual
        rate may differ.
      </p>
    </div>
  );
}

function SingleBreakdown({
  priceCents,
  costCents,
}: {
  priceCents: number;
  costCents: number;
}) {
  const { feeCents, profitCents, isLoss } = splitFor(priceCents, costCents);

  // On a loss cost + fee exceed the price, so the bar grows to cost + fee and
  // the part beyond the price shows as an overflow segment.
  const costInPrice = Math.min(costCents, priceCents);
  const feeInPrice = Math.min(feeCents, priceCents - costInPrice);
  const overflow = costCents + feeCents - costInPrice - feeInPrice;
  const total = priceCents + overflow;
  const pct = (cents: number) => `${(cents / total) * 100}%`;

  const lossAmount = formatPrice(-profitCents);
  const label = `Price ${formatPrice(priceCents)}: cost ${formatPrice(costCents)}, estimated card fee ${formatPrice(feeCents)}, ${
    isLoss ? `loss ${lossAmount}` : `profit ${formatPrice(profitCents)}`
  }`;

  return (
    <div className="space-y-2">
      <div
        role="img"
        aria-label={label}
        className="flex h-2 w-full overflow-hidden rounded-full"
      >
        <div
          className="bg-muted-foreground/60"
          style={{ width: pct(costInPrice) }}
        />
        <div
          className="bg-muted-foreground/25"
          style={{ width: pct(feeInPrice) }}
        />
        {!isLoss && (
          <div className="bg-primary" style={{ width: pct(profitCents) }} />
        )}
        {overflow > 0 && (
          <div className="bg-destructive" style={{ width: pct(overflow) }} />
        )}
      </div>

      <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <LegendItem dotClass="bg-muted-foreground/60" label="Cost">
          {formatPrice(costCents)}
        </LegendItem>
        <LegendItem dotClass="bg-muted-foreground/25" label="Est. card fee">
          {formatPrice(feeCents)}
        </LegendItem>
        <LegendItem
          dotClass={isLoss ? "bg-destructive" : "bg-primary"}
          label={isLoss ? "Loss" : "Profit"}
        >
          {isLoss ? lossAmount : formatPrice(profitCents)}
        </LegendItem>
      </ul>

      {isLoss ? (
        <p className="text-destructive text-sm font-medium">
          You lose {lossAmount} per sale after est. fees
        </p>
      ) : (
        <p className="text-sm">
          <span className="font-medium">{formatPrice(profitCents)}</span> profit
          per sale after est. fees
        </p>
      )}
    </div>
  );
}

function LegendItem({
  dotClass,
  label,
  children,
}: {
  dotClass: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full", dotClass)}
      />
      <span>{label}</span>
      <span className="text-foreground tabular-nums">{children}</span>
    </li>
  );
}

function VariantSummary({
  costCents,
  prices,
}: {
  costCents: number;
  prices: number[];
}) {
  const range = formatMarginRange(marginRange(costCents, prices));
  const lowestProfit = Math.min(
    ...prices.map((p) => splitFor(p, costCents).profitCents),
  );

  return (
    <p className="text-sm">
      Margin across variants: <span className="font-medium">{range}</span>
      <span className="text-muted-foreground">
        {" "}
        · lowest profit{" "}
        <span
          className={cn(
            "tabular-nums",
            lowestProfit <= 0 && "text-destructive font-medium",
          )}
        >
          {formatPrice(lowestProfit)}
        </span>{" "}
        per sale after est. fees
      </span>
    </p>
  );
}

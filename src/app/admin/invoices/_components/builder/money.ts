/**
 * Pure dollar↔cents and percent↔basis-point round-trips for the builder's
 * numeric inputs. Client-safe, no React.
 *
 * `~/components/ui/money-input`'s `MoneyInput` is dollar-denominated (its
 * `value`/`onChange` are a plain JS number of dollars), but every field it
 * feeds here — `lineItems[].unitPriceCents`, a flat `discountValue` — is
 * stored in integer CENTS (`~/lib/invoices/totals`). Discount PERCENT and
 * `taxRateBps` are stored in basis points (625 = 6.25%) but shown to the
 * owner as a plain percent. These four functions are the only place that
 * conversion happens, so every money/percent field in the builder rounds the
 * same way.
 */

/** Integer cents → the dollar number `MoneyInput` expects, or `null` when unset. */
export function centsToMoneyInputValue(
  cents: number | null | undefined,
): number | null {
  if (cents === null || cents === undefined || Number.isNaN(cents)) {
    return null;
  }
  return cents / 100;
}

/** `MoneyInput`'s dollar number → integer cents. `null`/`NaN` → 0 (an empty field means "no amount"). */
export function moneyInputValueToCents(dollars: number | null): number {
  if (dollars === null || Number.isNaN(dollars)) return 0;
  return Math.round(dollars * 100);
}

/** Integer basis points → the percent number shown in a percent field, or `null` when unset. */
export function bpsToPercentInputValue(
  bps: number | null | undefined,
): number | null {
  if (bps === null || bps === undefined || Number.isNaN(bps)) return null;
  return bps / 100;
}

/** A percent field's number → integer basis points. `null`/`NaN` → 0. */
export function percentInputValueToBps(percent: number | null): number {
  if (percent === null || Number.isNaN(percent)) return 0;
  return Math.round(percent * 100);
}

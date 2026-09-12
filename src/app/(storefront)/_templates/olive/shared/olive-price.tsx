import type { CSSProperties } from "react";

import { computeSavingsLabel, formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";

type OlivePriceProps = {
  /** Current price in cents. */
  price: number;
  /** Original price in cents, when the item is on sale. */
  compareAtPrice?: number | null;
  /** Prefix with "From" — variants that do not all share one price. */
  from?: boolean;
  /** Render the savings pill next to the struck-through original. Default true. */
  showSavings?: boolean;
  /** "true" = "Save 20%", "false" = "Save $5.00". Matches the platform's sale-badge setting. */
  savingsFormat?: string;
  align?: "start" | "center";
  className?: string;
  style?: CSSProperties;
};

/**
 * OlivePrice — one money line, formatted by the platform's own formatter.
 *
 * Prices are tabular (`olive-price`) so a column of them lines up. On sale the
 * current price stays first and loudest, the original follows struck through
 * in the caption size, and the saving is stated in words on a sage-tint pill
 * in leaf ink (6.7:1) rather than left for the reader to subtract.
 *
 * The pill is a LABEL, not a colour chip — the chip discipline reserves chips
 * for real colours, categories and stock states.
 */
export function OlivePrice({
  price,
  compareAtPrice,
  from = false,
  showSavings = true,
  savingsFormat,
  align = "start",
  className,
  style,
}: OlivePriceProps) {
  // Narrow once, to a number or null — a boolean flag would leave
  // `compareAtPrice` nullable at every use site below.
  const wasPrice =
    compareAtPrice != null && compareAtPrice > 0 && compareAtPrice > price
      ? compareAtPrice
      : null;

  return (
    <span
      className={cn(
        "flex flex-wrap items-baseline gap-x-2 gap-y-1",
        align === "center" && "justify-center",
        className,
      )}
      style={style}
    >
      <span className="olive-price">
        {wasPrice !== null ? (
          <span className="sr-only">Sale price </span>
        ) : null}
        {from ? `From ${formatPrice(price)}` : formatPrice(price)}
      </span>

      {wasPrice !== null ? (
        <span className="olive-caption line-through">
          <span className="sr-only">Original price </span>
          {formatPrice(wasPrice)}
        </span>
      ) : null}

      {wasPrice !== null && showSavings ? (
        <span
          className="olive-label"
          style={{
            color: "var(--olive-leaf)",
            backgroundColor: "var(--olive-sage-tint)",
            borderRadius: "999px",
            padding: "0.1875rem 0.5rem",
            fontSize: "0.6875rem",
          }}
        >
          {computeSavingsLabel(price, wasPrice, savingsFormat)}
        </span>
      ) : null}
    </span>
  );
}

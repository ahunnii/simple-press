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
  /** Render the saving in words next to the struck-through original. Default true. */
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
 * Tabular, lining figures (`olive-price`) so a column of them lines up. On
 * sale the current price stays first, the original follows struck through in
 * ink-soft, and the saving is stated in words as plain moss-deep text
 * (7.49:1 on sand, 8.24:1 on ivory) — no pill, no tint.
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
        <span className="olive-caption olive-tabular line-through">
          <span className="sr-only">Original price </span>
          {formatPrice(wasPrice)}
        </span>
      ) : null}

      {wasPrice !== null && showSavings ? (
        <span
          className="olive-tabular text-[0.75rem] font-medium"
          style={{ color: "var(--olive-moss-deep)" }}
        >
          {computeSavingsLabel(price, wasPrice, savingsFormat)}
        </span>
      ) : null}
    </span>
  );
}

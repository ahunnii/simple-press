import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";

type GlovePriceProps = {
  /** Current (lowest) price in cents. */
  price: number;
  /** Highest price in cents when the product has a price range. */
  maxPrice?: number | null;
  /** Original price in cents; shown struck through when above `price`. */
  compareAtPrice?: number | null;
  className?: string;
  /** "md" 18px (default), "sm" 15px (cards), "lg" 22px (product page). */
  size?: "sm" | "md" | "lg";
};

const SIZE = { sm: "text-[15px]", md: "text-[18px]", lg: "text-[22px]" };

/** Lato 700 primary price: handles ranges and compare-at. */
export function GlovePrice({
  price,
  maxPrice,
  compareAtPrice,
  className,
  size = "md",
}: GlovePriceProps) {
  const isRange = maxPrice != null && maxPrice > price;
  const isSale =
    !isRange &&
    compareAtPrice != null &&
    compareAtPrice > 0 &&
    compareAtPrice > price;

  return (
    <span
      className={cn(
        "glove-body font-bold text-[var(--glove-primary)]",
        SIZE[size],
        className,
      )}
    >
      {isRange ? (
        <>
          {formatPrice(price)} <span aria-hidden="true">&ndash;</span>
          <span className="sr-only"> to </span> {formatPrice(maxPrice)}
        </>
      ) : isSale ? (
        <>
          <span className="sr-only">Original price </span>
          <span className="mr-1.5 font-normal text-[var(--glove-muted)] line-through">
            {formatPrice(compareAtPrice)}
          </span>
          <span className="sr-only">Sale price </span>
          {formatPrice(price)}
        </>
      ) : (
        formatPrice(price)
      )}
    </span>
  );
}

import type { CustomizationLine } from "~/lib/customizer";
import type { CartItem } from "~/providers/cart-context";
import { formatPrice as defaultFormatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";

/**
 * The chosen options under a configured line — "Charms: Heart (included),
 * Star  +$5.00". Shared by cart rows (`CartLineOptions`) and storefront order
 * views (`OrderItemOptions`), so a build reads the same in both.
 *
 * Text only: cart customization comes from localStorage and is untrusted, so
 * nothing here is ever rendered as HTML or used as a URL.
 *
 * DOM: dl[data-slot=customizer-line-options]
 *        div[data-slot=customizer-line-option]
 *          dt[data-slot=customizer-line-option-label]
 *          dd[data-slot=customizer-line-option-value]
 *            span[data-slot=customizer-line-option-price]
 */

export type OptionLinesClassNames = Partial<
  Record<"root" | "row" | "label" | "value" | "price", string>
>;

export function OptionLines({
  lines,
  formatPrice = defaultFormatPrice,
  showPrices = true,
  className,
  classNames,
}: {
  lines: readonly CustomizationLine[];
  formatPrice?: (cents: number) => string;
  /** Show each group's add-on price ("+$5.00"). Default true. */
  showPrices?: boolean;
  className?: string;
  classNames?: OptionLinesClassNames;
}) {
  if (lines.length === 0) return null;
  return (
    <dl
      data-slot="customizer-line-options"
      className={cn(
        "text-muted-foreground flex flex-col gap-0.5 text-xs",
        classNames?.root,
        className,
      )}
    >
      {lines.map((line, index) => (
        <div
          key={`${index}-${line.label}`}
          data-slot="customizer-line-option"
          className={cn("flex flex-wrap gap-x-1", classNames?.row)}
        >
          <dt
            data-slot="customizer-line-option-label"
            className={cn("font-medium", classNames?.label)}
          >
            {line.label}:
          </dt>
          <dd
            data-slot="customizer-line-option-value"
            className={cn("min-w-0 break-words", classNames?.value)}
          >
            {line.value}
            {showPrices && line.price > 0 && (
              <span
                data-slot="customizer-line-option-price"
                className={cn("ml-1", classNames?.price)}
              >
                +{formatPrice(line.price)}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Options under a cart row. Renders nothing for a plain line. */
export function CartLineOptions({
  item,
  ...rest
}: {
  item: Pick<CartItem, "customization">;
} & Omit<Parameters<typeof OptionLines>[0], "lines">) {
  const lines = item.customization?.lines;
  if (!lines || lines.length === 0) return null;
  return <OptionLines lines={lines} {...rest} />;
}

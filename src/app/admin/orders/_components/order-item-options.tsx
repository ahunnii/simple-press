import { orderItemOptionLines } from "~/lib/customizer/display";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";

/**
 * The product customizer build of one order line (chain, charms, engraving),
 * read from the stored `OrderItem.customization` snapshot — what the
 * fulfiller has to make. Renders nothing for a plain line.
 *
 * Shared by the admin order page, fulfillment form, shipments panel and the
 * print documents. Safe in server and client components (no hooks).
 */
export function OrderItemOptions({
  customization,
  showPrices = true,
  className,
}: {
  /** `OrderItem.customization` JSON, any shape. */
  customization: unknown;
  /** Off on the packing slip, which goes in the box. */
  showPrices?: boolean;
  className?: string;
}) {
  const lines = orderItemOptionLines(customization);
  if (lines.length === 0) return null;
  return (
    <dl
      className={cn(
        "text-muted-foreground mt-1 space-y-0.5 text-sm",
        className,
      )}
    >
      {lines.map((line, index) => (
        <div key={index} className="flex flex-wrap gap-x-1">
          <dt className="font-medium">{line.label}:</dt>
          <dd className="break-words">
            {line.value}
            {showPrices && line.price > 0 && (
              <span className="tabular-nums"> +{formatPrice(line.price)}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

import Image from "next/image";
import { Package } from "lucide-react";

import type { WidgetProps } from "./types";
import { cn } from "~/lib/utils";

import { formatCount, formatCurrency } from "../format";
import { WidgetEmptyState } from "./empty-state";

export function TopProductsWidget({
  card,
  def,
  data,
}: WidgetProps<"topProducts">) {
  const limit = def.itemsBySize?.[card.size] ?? 5;
  const products = data.products.slice(0, limit);

  if (products.length === 0) {
    return (
      <WidgetEmptyState
        icon={Package}
        title="No sales data yet"
        hint="Top selling products will appear here"
      />
    );
  }

  return (
    <ol
      className={cn(
        "min-h-0 flex-1 overflow-y-auto",
        card.size === "4x2" &&
          "md:grid md:grid-flow-col md:grid-cols-2 md:grid-rows-5 md:gap-x-6 md:overflow-visible",
      )}
    >
      {products.map((product, index) => (
        <li
          key={product.productId ?? `${index}-${product.productName}`}
          className="hover:bg-muted flex items-center gap-3 rounded-lg px-2 py-1 transition-colors"
        >
          <span className="text-muted-foreground w-5 shrink-0 text-center text-sm font-bold tabular-nums">
            {index + 1}
          </span>
          <div className="bg-muted h-9 w-9 shrink-0 overflow-hidden rounded">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt=""
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package
                  aria-hidden="true"
                  className="text-muted-foreground h-4 w-4"
                />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-medium">
              {product.productName}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatCount(product.unitsSold)} sold
            </p>
          </div>
          <p className="text-sm font-semibold tabular-nums">
            {formatCurrency(product.revenue)}
          </p>
        </li>
      ))}
    </ol>
  );
}

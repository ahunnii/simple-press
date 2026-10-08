import type { Product } from "~/types";
import { cn } from "~/lib/utils";

import { GloveProductCard } from "./glove-product-card";
import { GloveRevealGroup } from "./glove-reveal";
import { gloveRevealItemStyle } from "./glove-reveal-style";

type GloveProductGridProps = {
  products: Product[];
  /** 3 columns on desktop (default) or 4. Always 2 on phones. */
  columns?: 3 | 4;
  /** Category names for a product's card. */
  categoriesFor?: (product: Product) => string[] | undefined;
  /** First N cards load eagerly. Default 3. */
  priorityCount?: number;
  surface?: "plain" | "card";
  className?: string;
};

/** Responsive product grid: 2 columns on phones, 3 (or 4) on desktop. */
export function GloveProductGrid({
  products,
  columns = 3,
  categoriesFor,
  priorityCount = 3,
  surface = "plain",
  className,
}: GloveProductGridProps) {
  return (
    <GloveRevealGroup threshold={0}>
      <ul
        className={cn(
          "m-0 grid list-none grid-cols-2 gap-x-3 gap-y-8 p-0 md:gap-x-6 md:gap-y-10",
          columns === 4 ? "md:grid-cols-3 lg:grid-cols-4" : "md:grid-cols-3",
          className,
        )}
      >
        {products.map((product, i) => (
          <li
            key={product.id}
            className="glove-reveal-item"
            style={gloveRevealItemStyle(i % 6)}
          >
            <GloveProductCard
              product={product}
              categories={categoriesFor?.(product)}
              surface={surface}
              priority={i < priorityCount}
            />
          </li>
        ))}
      </ul>
    </GloveRevealGroup>
  );
}

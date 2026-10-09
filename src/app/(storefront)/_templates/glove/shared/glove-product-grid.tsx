import type { Product } from "~/types";
import { cn } from "~/lib/utils";

import { GloveProductCard } from "./glove-product-card";

type GloveProductGridProps = {
  products: Product[];
  /** 3 columns on desktop (default) or 4. Always 2 on phones. */
  columns?: 3 | 4;
  /** First N cards load eagerly. Default 3. */
  priorityCount?: number;
  surface?: "plain" | "card";
  className?: string;
};

/** Responsive product grid: 2 columns on phones, 3 (or 4) on desktop. */
export function GloveProductGrid({
  products,
  columns = 3,
  priorityCount = 3,
  surface = "plain",
  className,
}: GloveProductGridProps) {
  return (
    <ul
      className={cn(
        "m-0 grid list-none grid-cols-2 gap-x-3 gap-y-8 p-0 md:gap-x-6 md:gap-y-10",
        columns === 4 ? "md:grid-cols-3 lg:grid-cols-4" : "md:grid-cols-3",
        className,
      )}
    >
      {products.map((product, i) => (
        <li key={product.id}>
          <GloveProductCard
            product={product}
            surface={surface}
            priority={i < priorityCount}
          />
        </li>
      ))}
    </ul>
  );
}

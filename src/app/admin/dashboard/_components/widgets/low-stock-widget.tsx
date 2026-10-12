import Link from "next/link";
import { AlertTriangle, Package } from "lucide-react";

import type { WidgetProps } from "./types";
import { cn } from "~/lib/utils";
import {
  DANGER_TEXT,
  SUCCESS_TEXT,
  WARNING_TEXT,
} from "~/app/admin/_components/admin-table-style";

import { formatCount } from "../format";
import { WidgetEmptyState } from "./empty-state";

type Row = {
  key: string;
  href: string | null;
  title: string;
  subtitle: string;
  qty: number;
};

const ROW_BASE =
  "flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 dark:border-amber-900 dark:bg-amber-950/40";

export function LowStockWidget({
  card,
  def,
  data,
  href,
}: WidgetProps<"lowStock">) {
  const limit = def.itemsBySize?.[card.size] ?? 5;

  const rows: Row[] = [
    ...data.variants.map((v) => ({
      key: `v-${v.id}`,
      href: null,
      title: v.productName,
      subtitle: v.name,
      qty: v.inventoryQty,
    })),
    ...data.pools.map((p) => ({
      key: `p-${p.id}`,
      // Deep-link to the pool, not the list: with 26+ pools the list is
      // paginated and the clicked pool may not be on page 1.
      href: `/admin/inventory/${p.id}`,
      title: p.name,
      subtitle: "Inventory item",
      qty: p.inventoryQty,
    })),
  ]
    .sort((a, b) => a.qty - b.qty)
    .slice(0, limit);

  if (rows.length === 0) {
    return (
      <WidgetEmptyState
        icon={Package}
        iconClassName={SUCCESS_TEXT}
        title="All stock levels are good!"
        hint="No products are running low"
      />
    );
  }

  const more = Math.max(0, data.totalCount - rows.length);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <ul
        className={cn(
          "min-h-0 flex-1 space-y-2 overflow-y-auto",
          card.size === "4x2" &&
            "md:grid md:grid-flow-col md:grid-cols-2 md:grid-rows-5 md:space-y-0 md:gap-x-6 md:gap-y-2 md:overflow-visible",
        )}
      >
        {rows.map((row) => {
          // `<= 0`, matching isOutOfStock on the inventory page: a negative
          // pool must read as broken, not merely low.
          const out = row.qty <= 0;
          const body = (
            <>
              <div className="flex min-w-0 items-center gap-2.5">
                <AlertTriangle
                  aria-hidden="true"
                  className={cn(
                    "h-4 w-4 shrink-0",
                    out ? DANGER_TEXT : WARNING_TEXT,
                  )}
                />
                <div className="min-w-0">
                  <p className="text-foreground truncate text-sm font-medium">
                    {row.title}
                  </p>
                  {row.subtitle && (
                    <p className="text-muted-foreground truncate text-xs">
                      {row.subtitle}
                    </p>
                  )}
                </div>
              </div>
              <p
                className={cn(
                  "shrink-0 text-sm font-semibold tabular-nums",
                  out
                    ? "text-red-700 dark:text-red-500"
                    : "text-amber-700 dark:text-amber-500",
                )}
              >
                {formatCount(row.qty)} left
              </p>
            </>
          );
          return (
            <li key={row.key}>
              {row.href ? (
                <Link
                  href={row.href}
                  className={cn(
                    ROW_BASE,
                    "transition-colors hover:bg-amber-100 dark:hover:bg-amber-950/60",
                  )}
                >
                  {body}
                </Link>
              ) : (
                <div className={ROW_BASE}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {more > 0 && (
        <Link
          href={href}
          className="text-muted-foreground hover:text-foreground shrink-0 text-xs transition-colors"
        >
          + {formatCount(more)} more low on stock
        </Link>
      )}
    </div>
  );
}

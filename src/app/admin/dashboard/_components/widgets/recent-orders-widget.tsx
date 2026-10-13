import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import type { WidgetProps } from "./types";
import { Badge } from "~/components/ui/badge";

import { formatCurrency, formatRelative, getStatusColor } from "../format";
import { WidgetEmptyState } from "./empty-state";

export function RecentOrdersWidget({
  card,
  def,
  data,
}: WidgetProps<"recentOrders">) {
  const limit = def.itemsBySize?.[card.size] ?? 5;
  const orders = data.orders.slice(0, limit);

  if (orders.length === 0) {
    return (
      <WidgetEmptyState
        icon={ShoppingCart}
        title="No orders yet"
        hint="Orders will appear here once customers start purchasing"
      />
    );
  }

  return (
    <ul
      className={
        card.size === "4x2"
          ? "min-h-0 flex-1 overflow-y-auto md:grid md:grid-flow-col md:grid-cols-2 md:grid-rows-5 md:gap-x-6 md:overflow-visible"
          : "min-h-0 flex-1 overflow-y-auto"
      }
    >
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/admin/orders/${order.id}`}
            className="hover:bg-muted flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">#{order.orderNumber}</p>
                <Badge
                  className={`text-xs font-normal ${getStatusColor(order.status)}`}
                >
                  {order.status}
                </Badge>
              </div>
              <p className="text-muted-foreground truncate text-xs">
                {order.customerName}
                <span aria-hidden="true"> · </span>
                {/* Relative to "now": server and client renders differ. */}
                <span suppressHydrationWarning>
                  {formatRelative(order.createdAt)}
                </span>
                {order.optionsHint && (
                  <>
                    <span aria-hidden="true"> · </span>
                    <span title={order.optionsHint.summary}>with options</span>
                  </>
                )}
              </p>
            </div>
            <p className="text-sm font-semibold tabular-nums">
              {formatCurrency(order.total)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

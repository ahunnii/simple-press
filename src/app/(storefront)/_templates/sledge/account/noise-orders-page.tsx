import Link from "next/link";
import { Package } from "lucide-react";

import type { OrdersPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { PageTransition } from "~/components/page-animations";

import { NoiseAccountLayout } from "./noise-account-layout";

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "completed": return { borderColor: "#16a34a", color: "#16a34a" };
    case "cancelled": return { borderColor: "#dc2626", color: "#dc2626" };
    case "refunded": return { color: "var(--vn-steel-mist)", borderColor: "var(--vn-rule)" };
    default: return {};
  }
}

export function NoiseOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <PageTransition>
      <NoiseAccountLayout heading="My Orders">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
            <div className="flex items-center justify-center border-2 border-foreground/20" style={{ width: "64px", height: "64px" }}>
              <Package className="size-6" style={{ color: "var(--vn-steel-mist)" }} />
            </div>
            <div>
              <p className="font-serif italic leading-none" style={{ fontSize: "28px", letterSpacing: "-0.01em" }}>
                No orders yet.
              </p>
              <p className="mt-2 font-sans text-sm" style={{ color: "var(--vn-steel-mist)" }}>
                When you place an order, it will appear here.
              </p>
            </div>
            <Link href="/shop" className="vn-stamp vn-stamp-solid text-[10px]">
              Shop the Collection →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Column headers */}
            <div className="hidden md:grid items-center border-b-2 border-foreground pb-3 gap-4" style={{ gridTemplateColumns: "auto 1fr auto auto auto" }}>
              {["Order", "Garments", "Date", "Status", "Total"].map((h) => (
                <span key={h} className="font-mono text-[9.5px] tracking-[0.22em] uppercase" style={{ color: "var(--vn-steel-mist)" }}>
                  {h}
                </span>
              ))}
            </div>

            {orders.map((order) => (
              <div key={order.id} className="border-b border-foreground/15 py-5">
                {/* Desktop: 5-column grid */}
                <div className="hidden md:grid items-center gap-x-4 gap-y-2" style={{ gridTemplateColumns: "auto 1fr auto auto auto" }}>
                  <span className="font-mono text-[10px] tracking-[0.14em] uppercase whitespace-nowrap" style={{ color: "var(--vn-steel)" }}>
                    #{order.orderNumber}
                  </span>

                  <div className="flex flex-wrap gap-1.5 min-w-0">
                    {order.items.slice(0, 2).map((item) => (
                      <span key={item.id} className="font-serif italic leading-none" style={{ fontSize: "15px", letterSpacing: "-0.005em" }}>
                        {item.productName}
                        {item.quantity > 1 && (
                          <span className="font-mono not-italic text-[9px] ml-1" style={{ color: "var(--vn-steel-mist)" }}>×{item.quantity}</span>
                        )}
                      </span>
                    ))}
                    {order.items.length > 2 && (
                      <span className="font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: "var(--vn-steel-mist)" }}>
                        +{order.items.length - 2}
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-[10px] tracking-[0.1em] whitespace-nowrap" style={{ color: "var(--vn-steel-mist)" }}>
                    {formatDate(order.createdAt)}
                  </span>

                  <span className="vn-stamp text-[9px] whitespace-nowrap" style={statusStyle(order.status)}>
                    {order.status}
                  </span>

                  <div className="flex flex-col items-end gap-1.5">
                    <span className="font-serif italic leading-none" style={{ fontSize: "20px", letterSpacing: "-0.01em" }}>
                      {formatPrice(order.total)}
                    </span>
                    <Link href={`/account/orders/${order.id}`} className="font-mono text-[9.5px] tracking-[0.18em] uppercase transition-opacity hover:opacity-60 whitespace-nowrap" style={{ color: "var(--vn-steel)" }}>
                      Details →
                    </Link>
                  </div>
                </div>

                {/* Mobile: stacked layout */}
                <div className="md:hidden flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--vn-steel)" }}>
                      #{order.orderNumber}
                    </span>
                    <span className="font-mono text-[9.5px] tracking-[0.1em]" style={{ color: "var(--vn-steel-mist)" }}>
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-w-0">
                    {order.items.slice(0, 2).map((item) => (
                      <span key={item.id} className="font-serif italic leading-none" style={{ fontSize: "15px", letterSpacing: "-0.005em" }}>
                        {item.productName}
                        {item.quantity > 1 && (
                          <span className="font-mono not-italic text-[9px] ml-1" style={{ color: "var(--vn-steel-mist)" }}>×{item.quantity}</span>
                        )}
                      </span>
                    ))}
                    {order.items.length > 2 && (
                      <span className="font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: "var(--vn-steel-mist)" }}>
                        +{order.items.length - 2}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="vn-stamp text-[9px] whitespace-nowrap" style={statusStyle(order.status)}>
                      {order.status}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-serif italic leading-none" style={{ fontSize: "18px", letterSpacing: "-0.01em" }}>
                        {formatPrice(order.total)}
                      </span>
                      <Link href={`/account/orders/${order.id}`} className="font-mono text-[9.5px] tracking-[0.18em] uppercase transition-opacity hover:opacity-60 whitespace-nowrap" style={{ color: "var(--vn-steel)" }}>
                        Details →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </NoiseAccountLayout>
    </PageTransition>
  );
}

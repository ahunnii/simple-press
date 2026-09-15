"use client";

import type { CSSProperties } from "react";

import type { OrdersPageTemplateProps } from "../../types";
import type { OliveStatus } from "../shared";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import {
  OliveButton,
  OliveEmptyState,
  OliveRevealGroup,
  OliveStatusBadge,
} from "../shared";
import { OliveAccountLayout } from "./olive-account-layout";

/** `Order.status` is only ever one of these four (see prisma/schema.prisma). */
const ORDER_STATUSES = new Set<string>([
  "open",
  "completed",
  "cancelled",
  "refunded",
]);

function toOrderStatus(status: string): OliveStatus {
  return (ORDER_STATUSES.has(status) ? status : "open") as OliveStatus;
}

/** White order cards with a status chip, date, item chips and a total. */
export function OliveOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <OliveAccountLayout
      heading="Orders"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Orders" },
      ]}
    >
      {orders.length === 0 ? (
        <OliveEmptyState
          heading="No orders yet"
          body="When you place one, it'll land right here — with everything you need to track it."
          cta={{ label: "Shop now", href: "/shop" }}
        />
      ) : (
        <OliveRevealGroup className="flex flex-col gap-4" fan>
          {orders.map((order, i) => {
            const visibleItems = order.items.slice(0, 3);
            const extra = order.items.length - visibleItems.length;
            return (
              <article
                key={order.id}
                className="olive-card olive-reveal-item"
                style={
                  { "--i": Math.min(i, 8), padding: "1.5rem" } as CSSProperties
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="olive-h3" style={{ margin: "0 0 0.25rem" }}>
                      Order #{order.orderNumber}
                    </p>
                    <p className="olive-caption" style={{ margin: 0 }}>
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <OliveStatusBadge status={toOrderStatus(order.status)} />
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {visibleItems.map((item) => (
                    <span
                      key={item.id}
                      className="olive-caption"
                      style={{
                        backgroundColor: "var(--olive-paper)",
                        borderRadius: "999px",
                        padding: "0.1875rem 0.625rem",
                      }}
                    >
                      {item.productName}
                      {item.variantName ? ` — ${item.variantName}` : ""} ×{" "}
                      {item.quantity}
                    </span>
                  ))}
                  {extra > 0 ? (
                    <span
                      className="olive-caption"
                      style={{
                        backgroundColor: "var(--olive-paper)",
                        borderRadius: "999px",
                        padding: "0.1875rem 0.625rem",
                      }}
                    >
                      +{extra} more
                    </span>
                  ) : null}
                </div>

                <div
                  className="mt-4 flex items-center justify-between pt-4"
                  style={{ borderTop: "1px solid var(--olive-hairline)" }}
                >
                  <span className="olive-price">
                    {formatPrice(order.total)}
                  </span>
                  <OliveButton
                    variant="ghost"
                    href={`/account/orders/${order.id}`}
                  >
                    View details
                  </OliveButton>
                </div>
              </article>
            );
          })}
        </OliveRevealGroup>
      )}
    </OliveAccountLayout>
  );
}

"use client";

import type { OrdersPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

import { GloveButton } from "../shared/glove-button";
import { GloveRevealGroup } from "../shared/glove-reveal";
import { gloveRevealItemStyle } from "../shared/glove-reveal-style";
import { GloveAccountLayout } from "./glove-account-layout";
import {
  GloveAccountCard,
  GloveAccountEmpty,
  GloveOrderStatus,
} from "./glove-account-ui";

const CHIP =
  "rounded-full bg-[var(--glove-cloud)] px-3 py-0.5 text-[13px] text-[var(--glove-text)]";

/** Order history: white hairline cards with a status pill, item chips and a total. */
export function GloveOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <GloveAccountLayout heading="Orders">
      {orders.length === 0 ? (
        <GloveAccountEmpty
          heading="No orders yet"
          body="When you place one, it will land right here, with everything you need to track it."
          cta={{ label: "Shop now", href: "/shop" }}
        />
      ) : (
        <GloveRevealGroup threshold={0} className="flex flex-col gap-4">
          {orders.map((order, i) => {
            const visibleItems = order.items.slice(0, 3);
            const extra = order.items.length - visibleItems.length;
            return (
              <GloveAccountCard
                key={order.id}
                as="article"
                className="glove-reveal-item"
                style={gloveRevealItemStyle(i)}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="glove-display text-[18px] leading-tight font-medium text-[var(--glove-ink)]">
                      Order #{order.orderNumber}
                    </p>
                    <p className="mt-1 text-[14px] text-[var(--glove-muted)]">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <GloveOrderStatus status={order.status} />
                </div>

                <ul className="m-0 mt-4 flex list-none flex-wrap gap-1.5 p-0">
                  {visibleItems.map((item) => (
                    <li key={item.id} className={CHIP}>
                      {item.productName}
                      {item.variantName ? ` — ${item.variantName}` : ""} ×{" "}
                      {item.quantity}
                    </li>
                  ))}
                  {extra > 0 ? <li className={CHIP}>+{extra} more</li> : null}
                </ul>

                <div className="mt-4 flex items-center justify-between gap-4 border-t border-[var(--glove-line)] pt-4">
                  <span className="glove-body text-[18px] font-bold text-[var(--glove-primary)]">
                    {formatPrice(order.total)}
                  </span>
                  <GloveButton
                    href={`/account/orders/${order.id}`}
                    variant="wooOutline"
                    size="sm"
                  >
                    View details
                    <span className="sr-only">
                      {" "}
                      for order {order.orderNumber}
                    </span>
                  </GloveButton>
                </div>
              </GloveAccountCard>
            );
          })}
        </GloveRevealGroup>
      )}
    </GloveAccountLayout>
  );
}

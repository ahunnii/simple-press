import Link from "next/link";

import type { OrdersPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";

import { resolveUmscAccountFields } from ".";
import { UmscButton } from "../shared/umsc-button";
import { UmscImageFallback } from "../shared/umsc-image-fallback";
import { UmscAccountLayout } from "./umsc-account-layout";
import { UmscOrderStatusBadge } from "./umsc-order-status-badge";

const FIELD_KEYS = [
  "umsc.global.account-orders-empty-heading",
  "umsc.global.account-orders-empty-body",
  "umsc.global.account-orders-empty-button",
];

export function UmscOrdersPage({ business, orders }: OrdersPageTemplateProps) {
  const f = resolveUmscAccountFields(
    business.siteContent?.customFields,
    FIELD_KEYS,
  );

  return (
    <UmscAccountLayout
      heading="Orders"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Orders" },
      ]}
    >
      {orders.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-6 size-16">
            <UmscImageFallback aspect="1 / 1" />
          </div>
          <h2
            {...fieldAttr("umsc.global.account-orders-empty-heading")}
            className="umsc-serif text-[22px] font-normal text-[var(--umsc-ink)]"
          >
            {f["umsc.global.account-orders-empty-heading"] ?? ""}
          </h2>
          {f["umsc.global.account-orders-empty-body"] ? (
            <p
              {...fieldAttr("umsc.global.account-orders-empty-body")}
              className="umsc-sans mt-3 max-w-[36ch] text-[15px] leading-[1.6] text-[var(--umsc-muted)]"
            >
              {f["umsc.global.account-orders-empty-body"]}
            </p>
          ) : null}
          {f["umsc.global.account-orders-empty-button"] ? (
            <UmscButton
              as="link"
              href="/shop"
              variant="gold"
              showArrow={false}
              fieldKey="umsc.global.account-orders-empty-button"
              className="mt-7"
            >
              {f["umsc.global.account-orders-empty-button"]}
            </UmscButton>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="border border-[var(--umsc-line)] bg-[var(--umsc-white)] p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="umsc-sans text-[11px] font-semibold tracking-[0.1em] text-[var(--umsc-muted)] uppercase">
                    Order #{order.orderNumber}
                  </p>
                  <p className="umsc-sans mt-1 text-[13px] text-[var(--umsc-muted)]">
                    {formatDate(order.createdAt)}
                  </p>
                  <p className="umsc-sans text-[13px] text-[var(--umsc-muted)]">
                    {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "items"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <UmscOrderStatusBadge status={order.status} />
                  <p className="umsc-tabular umsc-serif text-[20px] font-normal text-[var(--umsc-ink)]">
                    {formatPrice(order.total)}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-[var(--umsc-line)] pt-4">
                <div className="flex flex-wrap gap-1.5">
                  {order.items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="umsc-sans border border-[var(--umsc-line)] bg-[var(--umsc-cream)] px-2.5 py-1 text-[12px] text-[var(--umsc-muted)]"
                    >
                      {item.productName}
                      {item.variantName ? ` — ${item.variantName}` : ""} ×{" "}
                      {item.quantity}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span className="umsc-sans border border-[var(--umsc-line)] bg-[var(--umsc-cream)] px-2.5 py-1 text-[12px] text-[var(--umsc-muted)]">
                      +{order.items.length - 3} more
                    </span>
                  )}
                </div>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="umsc-sans mt-3.5 inline-block text-[13px] font-semibold text-[var(--umsc-gold-ink)] hover:text-[var(--umsc-ink)]"
                >
                  View details →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </UmscAccountLayout>
  );
}

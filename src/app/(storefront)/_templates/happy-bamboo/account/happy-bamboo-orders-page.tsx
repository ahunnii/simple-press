import Link from "next/link";
import { Package } from "lucide-react";

import type { OrdersPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { HappyBambooAccountLayout } from "./happy-bamboo-account-layout";

function statusClass(status: string) {
  switch (status) {
    case "paid":
      return "bg-blue-100 text-blue-800";
    case "fulfilled":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "refunded":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}

export function HappyBambooOrdersPage({ orders }: OrdersPageTemplateProps) {
  return (
    <PageTransition>
      <HappyBambooAccountLayout
        heading="My Orders"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account/settings" },
          { label: "Orders" },
        ]}
      >
        {orders.length === 0 ? (
          <FadeIn direction="up">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-primary/10 mb-4 flex size-16 items-center justify-center rounded-full">
                <Package className="text-primary size-8" />
              </div>
              <h2 className="font-heading text-foreground mb-2 text-xl font-semibold">
                No orders yet
              </h2>
              <p className="text-muted-foreground mb-6 text-sm">
                When you place an order, it will appear here.
              </p>
              <Button asChild size="lg">
                <Link href="/shop">Start Shopping</Link>
              </Button>
            </div>
          </FadeIn>
        ) : (
          <StaggerContainer className="space-y-4" staggerDelay={0.08}>
            {orders.map((order) => (
              <StaggerItem key={order.id}>
                <Card className="border-border/60 bg-card">
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-muted-foreground text-sm">
                          Order #{order.orderNumber}
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {formatDate(order.createdAt)}
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {order.items.length}{" "}
                          {order.items.length === 1 ? "item" : "items"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClass(order.status)}`}
                        >
                          {order.status}
                        </span>
                        <p className="text-foreground text-lg font-bold">
                          {formatPrice(order.total)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 border-t pt-4">
                      <div className="flex flex-wrap gap-2">
                        {order.items.slice(0, 3).map((item) => (
                          <span
                            key={item.id}
                            className="bg-secondary text-foreground rounded-full px-3 py-1 text-xs"
                          >
                            {item.productName}
                            {item.variantName
                              ? ` — ${item.variantName}`
                              : ""} × {item.quantity}
                          </span>
                        ))}
                        {order.items.length > 3 && (
                          <span className="bg-secondary text-muted-foreground rounded-full px-3 py-1 text-xs">
                            +{order.items.length - 3} more
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="text-primary mt-4 inline-block text-sm font-semibold hover:underline"
                      >
                        View Details →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </HappyBambooAccountLayout>
    </PageTransition>
  );
}

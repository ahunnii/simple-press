import Link from "next/link";
import { Repeat } from "lucide-react";

import type { SubscriptionsPageTemplateProps } from "../../types";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { SUBSCRIPTION_STATUS_LABELS } from "~/lib/validators/subscription";
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
    case "active":
      return "bg-green-100 text-green-800";
    case "paused":
      return "bg-yellow-100 text-yellow-800";
    case "past_due":
      return "bg-red-100 text-red-800";
    case "cancelled":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/** Next date line for a subscription card — mirrors the manage page's own logic, kept small since it only needs a one-line summary here. */
function nextDateLabel(
  subscription: SubscriptionsPageTemplateProps["subscriptions"][number],
): string | null {
  if (subscription.status === "cancelled") return null;
  if (subscription.status === "paused") {
    return subscription.pauseResumesAt
      ? `Resumes ${formatDate(subscription.pauseResumesAt)}`
      : "Paused";
  }
  if (subscription.nextBillingAt) {
    return `Next delivery ${formatDate(subscription.nextBillingAt)}`;
  }
  return null;
}

export function HappyBambooSubscriptionsPage({
  subscriptions,
}: SubscriptionsPageTemplateProps) {
  return (
    <PageTransition>
      <HappyBambooAccountLayout
        heading="My Subscriptions"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account/settings" },
          { label: "Subscriptions" },
        ]}
      >
        {subscriptions.length === 0 ? (
          <FadeIn direction="up">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-primary/10 mb-4 flex size-16 items-center justify-center rounded-full">
                <Repeat className="text-primary size-8" />
              </div>
              <h2 className="font-heading text-foreground mb-2 text-xl font-semibold">
                You don&apos;t have any subscriptions yet
              </h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Subscribe to a product for recurring delivery and it will appear
                here.
              </p>
              <Button asChild size="lg">
                <Link href="/shop">Browse Products</Link>
              </Button>
            </div>
          </FadeIn>
        ) : (
          <StaggerContainer className="space-y-4" staggerDelay={0.08}>
            {subscriptions.map((subscription) => {
              const nextDate = nextDateLabel(subscription);
              return (
                <StaggerItem key={subscription.id}>
                  <Card className="border-border/60 bg-card">
                    <CardContent className="p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-foreground text-sm font-semibold">
                            {subscription.productName}
                            {subscription.variantName
                              ? ` — ${subscription.variantName}`
                              : ""}
                          </p>
                          <p className="text-muted-foreground mt-1 text-sm">
                            Qty {subscription.quantity} &middot;{" "}
                            {subscription.intervalLabel}
                          </p>
                          {nextDate && (
                            <p className="text-muted-foreground mt-1 text-sm">
                              {nextDate}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClass(subscription.status)}`}
                          >
                            {SUBSCRIPTION_STATUS_LABELS[
                              subscription.status as keyof typeof SUBSCRIPTION_STATUS_LABELS
                            ] ?? subscription.status}
                          </span>
                          <p className="text-foreground text-lg font-bold">
                            {formatPrice(subscription.perDeliveryCents)}
                            <span className="text-muted-foreground text-xs font-normal">
                              {" "}
                              / delivery
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 border-t pt-4">
                        <a
                          href={subscription.manageUrl}
                          className="text-primary text-sm font-semibold hover:underline"
                        >
                          Manage →
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </HappyBambooAccountLayout>
    </PageTransition>
  );
}

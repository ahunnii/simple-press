import { notFound, redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { BambooOrdersPage } from "../../_templates/bamboo/bamboo-orders-page";
import { DarkTrendOrdersPage } from "../../_templates/dark-trend/dark-trend-orders-page";
import { DefaultOrdersPage } from "../../_templates/default/default-orders-page";
import { HappyBambooOrdersPage } from "../../_templates/happy-bamboo/orders/happy-bamboo-orders-page";
import { ModernOrdersPage } from "../../_templates/modern/modern-orders-page";
import { PollenOrdersPage } from "../../_templates/pollen/pollen-orders-page";

export const metadata = {
  title: "My Orders",
};

export default async function OrdersPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/sign-in?redirect=/account/orders");
  }

  const [business, orders] = await Promise.all([
    api.business.simplifiedGet(),
    api.customer.getMyOrders(),
  ]);

  if (!business) notFound();

  const TemplateComponent =
    {
      "dark-trend": DarkTrendOrdersPage,
      pollen: PollenOrdersPage,
      modern: ModernOrdersPage,
      bamboo: BambooOrdersPage,
      "happy-bamboo": HappyBambooOrdersPage,
    }[business.templateId] ?? DefaultOrdersPage;

  return <TemplateComponent business={business} orders={orders} />;
}

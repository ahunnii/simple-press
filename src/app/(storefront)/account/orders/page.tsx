import { notFound, redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { BambooOrdersPage } from "../../_templates/bamboo/account/bamboo-orders-page";
import { DarkTrendOrdersPage } from "../../_templates/dark-trend/account/dark-trend-orders-page";
import { DefaultOrdersPage } from "../../_templates/default/account/default-orders-page";
import { ElegantOrdersPage } from "../../_templates/elegant/account/elegant-orders-page";
import { HappyBambooOrdersPage } from "../../_templates/happy-bamboo/account/happy-bamboo-orders-page";
import { ModernOrdersPage } from "../../_templates/modern/account/modern-orders-page";
import { NoiseOrdersPage } from "../../_templates/noise/account/noise-orders-page";
import { PollenOrdersPage } from "../../_templates/pollen/account/pollen-orders-page";
import { SledgeOrdersPage } from "../../_templates/sledge/account/sledge-orders-page";

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
      elegant: ElegantOrdersPage,
      pollen: PollenOrdersPage,
      modern: ModernOrdersPage,
      bamboo: BambooOrdersPage,
      "happy-bamboo": HappyBambooOrdersPage,
      noise: NoiseOrdersPage,
      sledge: SledgeOrdersPage,
    }[business.templateId] ?? DefaultOrdersPage;

  return <TemplateComponent business={business} orders={orders} />;
}

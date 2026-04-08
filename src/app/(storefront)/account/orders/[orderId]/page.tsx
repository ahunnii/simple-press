import { notFound, redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { BambooOrderDetailPage } from "../../../_templates/bamboo/bamboo-order-detail-page";
import { DarkTrendOrderDetailPage } from "../../../_templates/dark-trend/dark-trend-order-detail-page";
import { DefaultOrderDetailPage } from "../../../_templates/default/default-order-detail-page";
import { HappyBambooOrderDetailPage } from "../../../_templates/happy-bamboo/orders/happy-bamboo-order-detail-page";
import { ModernOrderDetailPage } from "../../../_templates/modern/modern-order-detail-page";
import { PollenOrderDetailPage } from "../../../_templates/pollen/pollen-order-detail-page";

export const metadata = {
  title: "Order Details",
};

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session?.user) {
    const { orderId } = await params;
    redirect(`/auth/sign-in?redirect=/account/orders/${orderId}`);
  }

  const { orderId } = await params;

  const [business, order] = await Promise.all([
    api.business.simplifiedGet(),
    api.customer.getMyOrderById({ orderId }),
  ]);

  if (!business) notFound();
  if (!order) notFound();

  const TemplateComponent =
    {
      "dark-trend": DarkTrendOrderDetailPage,
      pollen: PollenOrderDetailPage,
      modern: ModernOrderDetailPage,
      bamboo: BambooOrderDetailPage,
      "happy-bamboo": HappyBambooOrderDetailPage,
    }[business.templateId] ?? DefaultOrderDetailPage;

  return <TemplateComponent business={business} order={order} />;
}

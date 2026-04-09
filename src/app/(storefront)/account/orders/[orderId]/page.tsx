import { notFound, redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { BambooOrderDetailPage } from "../../../_templates/bamboo/account/bamboo-order-detail-page";
import { DarkTrendOrderDetailPage } from "../../../_templates/dark-trend/account/dark-trend-order-detail-page";
import { DefaultOrderDetailPage } from "../../../_templates/default/account/default-order-detail-page";
import { ElegantOrderDetailPage } from "../../../_templates/elegant/account/elegant-order-detail-page";
import { HappyBambooOrderDetailPage } from "../../../_templates/happy-bamboo/account/happy-bamboo-order-detail-page";
import { ModernOrderDetailPage } from "../../../_templates/modern/account/modern-order-detail-page";
import { NoiseOrderDetailPage } from "../../../_templates/noise/account/noise-order-detail-page";
import { PollenOrderDetailPage } from "../../../_templates/pollen/account/pollen-order-detail-page";

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
      elegant: ElegantOrderDetailPage,
      pollen: PollenOrderDetailPage,
      modern: ModernOrderDetailPage,
      bamboo: BambooOrderDetailPage,
      "happy-bamboo": HappyBambooOrderDetailPage,
      noise: NoiseOrderDetailPage,
    }[business.templateId] ?? DefaultOrderDetailPage;

  return <TemplateComponent business={business} order={order} />;
}

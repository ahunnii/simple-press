import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { BambooOrderSuccessPage } from "../../_templates/bamboo/cart-checkout/bamboo-order-success-page";
import { DarkTrendOrderSuccessPage } from "../../_templates/dark-trend/cart-checkout/dark-trend-order-success-page";
import { DefaultOrderSuccessPage } from "../../_templates/default/cart-checkout/default-order-success-page";
import { ElegantOrderSuccessPage } from "../../_templates/elegant/cart-checkout/elegant-order-success-page";
import { HappyBambooOrderSuccessPage } from "../../_templates/happy-bamboo/cart-checkout/happy-bamboo-order-success-page";
import { ModernOrderSuccessPage } from "../../_templates/modern/cart-checkout/modern-order-success-page";
import { NoiseOrderSuccessPage } from "../../_templates/noise/cart-checkout/noise-order-success-page";
import { PollenOrderSuccessPage } from "../../_templates/pollen/cart-checkout/pollen-order-success-page";
import { SledgeOrderSuccessPage } from "../../_templates/sledge/cart-checkout/sledge-order-success-page";

export default async function OrderSuccessPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const TemplateComponent =
    {
      "dark-trend": DarkTrendOrderSuccessPage,
      elegant: ElegantOrderSuccessPage,
      bamboo: BambooOrderSuccessPage,
      noise: NoiseOrderSuccessPage,
      "happy-bamboo": HappyBambooOrderSuccessPage,
      modern: ModernOrderSuccessPage,
      pollen: PollenOrderSuccessPage,
      sledge: SledgeOrderSuccessPage,
    }[business.templateId] ?? DefaultOrderSuccessPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Order Details",
};

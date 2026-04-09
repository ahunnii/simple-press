import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { BambooCartPage } from "../_templates/bamboo/cart-checkout/bamboo-cart-page";
import { DarkTrendCartPage } from "../_templates/dark-trend/cart-checkout/dark-trend-cart-page";
import { DefaultCartPage } from "../_templates/default/cart-checkout/default-cart-page";
import { ElegantCartPage } from "../_templates/elegant/cart-checkout/elegant-cart-page";
import { HappyBambooCartPage } from "../_templates/happy-bamboo/cart-checkout/happy-bamboo-cart-page";
import ModernCartPage from "../_templates/modern/cart-checkout/modern-cart-page";
import { NoiseCartPage } from "../_templates/noise/cart-checkout/noise-cart-page";
import { PollenCartPage } from "../_templates/pollen/cart-checkout/pollen-cart-page";

export default async function CartPage() {
  const business = await api.business.simplifiedGetWithProducts();
  if (!business) notFound();

  const TemplateComponent =
    {
      pollen: PollenCartPage,
      "dark-trend": DarkTrendCartPage,
      elegant: ElegantCartPage,
      modern: ModernCartPage,
      bamboo: BambooCartPage,
      "happy-bamboo": HappyBambooCartPage,
      noise: NoiseCartPage,
    }[business.templateId] ?? DefaultCartPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Cart",
};

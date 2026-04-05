import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { BambooCartPage } from "../_templates/bamboo/bamboo-cart-page";
import { DarkTrendCartPage } from "../_templates/dark-trend/dark-trend-cart-page";
import { DefaultCartPage } from "../_templates/default/default-cart-page";
import { HappyBambooCartPage } from "../_templates/happy-bamboo/cart-checkout/happy-bamboo-cart-page";
import ModernCartPage from "../_templates/modern/modern-cart-page";

export default async function CartPage() {
  const business = await api.business.simplifiedGetWithProducts();
  if (!business) notFound();

  if (business.templateId === "pollen") {
    notFound();
  }

  const TemplateComponent =
    {
      "dark-trend": DarkTrendCartPage,
      modern: ModernCartPage,
      bamboo: BambooCartPage,
      "happy-bamboo": HappyBambooCartPage,
    }[business.templateId] ?? DefaultCartPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Cart",
};

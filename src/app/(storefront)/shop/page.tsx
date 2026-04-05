import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { BambooShopPage } from "../_templates/bamboo/bamboo-shop-page";
import { DarkTrendProductsPage } from "../_templates/dark-trend/dark-trend-products-page";
import { DefaultProductsPage } from "../_templates/default/default-products-page";
import { ElegantShopPage } from "../_templates/elegant/elegant-shop-page";
import { HappyBambooShopPage } from "../_templates/happy-bamboo/products/happy-bamboo-shop-page";
import { ModernProductsPage } from "../_templates/modern/modern-products-page";

export default async function ProductsPage() {
  const business = await api.business.getWithProducts();

  if (!business) notFound();

  if (business.templateId === "pollen") {
    notFound();
  }

  const TemplateComponent =
    {
      "dark-trend": DarkTrendProductsPage,
      modern: ModernProductsPage,
      elegant: ElegantShopPage,
      bamboo: BambooShopPage,
      "happy-bamboo": HappyBambooShopPage,
    }[business.templateId] ?? DefaultProductsPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Shop",
};

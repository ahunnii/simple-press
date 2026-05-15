import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { BambooShopPage } from "../_templates/bamboo/shop/bamboo-shop-page";
import { DarkTrendShopPage } from "../_templates/dark-trend/shop/dark-trend-shop-page";
import { DefaultProductsPage } from "../_templates/default/shop/default-shop-page";
import { ElegantShopPage } from "../_templates/elegant/shop/elegant-shop-page";
import { HappyBambooShopPage } from "../_templates/happy-bamboo/shop/happy-bamboo-shop-page";
import { ModernProductsPage } from "../_templates/modern/shop/modern-products-page";
import { NoiseShopPage } from "../_templates/noise/shop/noise-shop-page";
import { PollenShopPage } from "../_templates/pollen/shop/pollen-shop-page";

export default async function ProductsPage() {
  const business = await api.business.getWithProducts();

  if (!business) notFound();

  const TemplateComponent =
    {
      pollen: PollenShopPage,
      "dark-trend": DarkTrendShopPage,
      modern: ModernProductsPage,
      elegant: ElegantShopPage,
      bamboo: BambooShopPage,
      "happy-bamboo": HappyBambooShopPage,
      noise: NoiseShopPage,
    }[business.templateId] ?? DefaultProductsPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Shop",
};

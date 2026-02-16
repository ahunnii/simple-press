import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { DarkTrendProductsPage } from "../_templates/dark-trend/dark-trend-products-page";
import { DefaultProductsPage } from "../_templates/default/default-products-page";
import { ElegantShopPage } from "../_templates/elegant/elegant-shop-page";
import { ModernProductsPage } from "../_templates/modern/modern-products-page";
import { PollenServicesPage } from "../_templates/pollen/pollen-services-page";

export default async function ServicesPage() {
  const business = await api.business.get();

  if (!business) notFound();

  if (business.templateId !== "pollen") {
    notFound();
  }

  const TemplateComponent =
    {
      pollen: PollenServicesPage,
    }[business.templateId] ?? PollenServicesPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Services",
};

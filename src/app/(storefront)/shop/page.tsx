import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { DefaultProductsPage } from "../_templates/default/default-products-page";
import { ElegantShopPage } from "../_templates/elegant/elegant-shop-page";
import { ModernProductsPage } from "../_templates/modern/modern-products-page";

export const metadata = {
  title: "Shop",
};

export default async function ProductsPage() {
  const business = await api.business.getWithProducts();

  if (!business) {
    notFound();
  }

  const TemplateComponent =
    {
      modern: ModernProductsPage,
      elegant: ElegantShopPage,
    }[business.templateId] ?? DefaultProductsPage;

  return <TemplateComponent business={business} />;
}

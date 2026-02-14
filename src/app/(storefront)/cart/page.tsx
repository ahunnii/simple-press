import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { DarkTrendCartPage } from "../_templates/dark-trend/dark-trend-cart-page";
import { DefaultCartPage } from "../_templates/default/default-cart-page";
import ModernCartPage from "../_templates/modern/modern-cart-page";

export default async function CartPage() {
  const business = await api.business.get();

  if (!business) notFound();

  const TemplateComponent =
    {
      "dark-trend": DarkTrendCartPage,
      modern: ModernCartPage,
    }[business.templateId] ?? DefaultCartPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Cart",
};

import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { DarkTrendCheckoutPage } from "../_templates/dark-trend/dark-trend-checkout-page";
import { DefaultCheckoutPage } from "../_templates/default/default-checkout-page";
import { DefaultCheckoutUnavailable } from "../_templates/default/default-checkout-unavailable";
import { ModernCheckoutPage } from "../_templates/modern/modern-checkout-page";

export default async function CheckoutPage() {
  const business = await api.business.simplifiedGetWithProducts();

  if (!business) notFound();

  if (business.templateId === "pollen") {
    notFound();
  }

  const TemplateUnavailableComponent =
    {
      modern: DefaultCheckoutUnavailable,
    }[business.templateId] ?? DefaultCheckoutUnavailable;

  if (!business.isStripeConnected)
    return <TemplateUnavailableComponent business={business} />;

  const TemplateComponent =
    {
      "dark-trend": DarkTrendCheckoutPage,
      modern: ModernCheckoutPage,
    }[business.templateId] ?? DefaultCheckoutPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Checkout",
};

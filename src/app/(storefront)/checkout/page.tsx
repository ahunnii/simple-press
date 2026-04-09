import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { BambooCheckoutPage } from "../_templates/bamboo/cart-checkout/bamboo-checkout-page";
import { DarkTrendCheckoutPage } from "../_templates/dark-trend/dark-trend-checkout-page";
import { DefaultCheckoutPage } from "../_templates/default/default-checkout-page";
import { DefaultCheckoutUnavailable } from "../_templates/default/default-checkout-unavailable";
import { ElegantCheckoutPage } from "../_templates/elegant/elegant-checkout-page";
import { HappyBambooCheckoutPage } from "../_templates/happy-bamboo/cart-checkout/happy-bamboo-checkout-page";
import { ModernCheckoutPage } from "../_templates/modern/modern-checkout-page";
import { NoiseCheckoutPage } from "../_templates/noise/cart-checkout/noise-checkout-page";
import { PollenCheckoutPage } from "../_templates/pollen/pollen-checkout-page";

export default async function CheckoutPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const TemplateUnavailableComponent =
    {
      modern: DefaultCheckoutUnavailable,
    }[business.templateId] ?? DefaultCheckoutUnavailable;

  if (!business.isStripeConnected) return <TemplateUnavailableComponent />;

  const TemplateComponent =
    {
      "dark-trend": DarkTrendCheckoutPage,
      modern: ModernCheckoutPage,
      bamboo: BambooCheckoutPage,
      "happy-bamboo": HappyBambooCheckoutPage,
      elegant: ElegantCheckoutPage,
      pollen: PollenCheckoutPage,
      noise: NoiseCheckoutPage,
    }[business.templateId] ?? DefaultCheckoutPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Checkout",
};

import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { BambooOrderSuccessPage } from "../../_templates/bamboo/bamboo-order-success-page";
import { DarkTrendOrderSuccessPage } from "../../_templates/dark-trend/dark-trend-order-success-page";
import { DefaultOrderSuccessPage } from "../../_templates/default/default-order-success-page";

export default async function OrderSuccessPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();
  if (business.templateId === "pollen") {
    notFound();
  }

  const TemplateComponent =
    {
      "dark-trend": DarkTrendOrderSuccessPage,
      bamboo: BambooOrderSuccessPage,
    }[business.templateId] ?? DefaultOrderSuccessPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Order Details",
};

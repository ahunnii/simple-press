import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { DarkTrendAboutPage } from "../_templates/dark-trend/dark-trend-about-page";
import { DefaultAboutPage } from "../_templates/default/default-about-page";
import { ModernAboutPage } from "../_templates/modern/modern-about-page";

export default async function AboutPage() {
  const business = await api.business.get({ includeProducts: true });

  if (!business) {
    notFound();
  }

  const TemplateComponent =
    {
      "dark-trend": DarkTrendAboutPage,
      modern: ModernAboutPage,
    }[business.templateId] ?? DefaultAboutPage;

  return <TemplateComponent business={business} />;
}

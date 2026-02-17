import { api } from "~/trpc/server";

import { DarkTrendAboutPage } from "../_templates/dark-trend/dark-trend-about-page";
import { DefaultAboutPage } from "../_templates/default/default-about-page";
import { ModernAboutPage } from "../_templates/modern/modern-about-page";
import { PollenAboutPage } from "../_templates/pollen/pollen-about-page";

export default async function AboutPage() {
  const business = await api.business.simplifiedGetWithProducts();

  const TemplateComponent =
    {
      "dark-trend": DarkTrendAboutPage,
      pollen: PollenAboutPage,
      modern: ModernAboutPage,
    }[business.templateId] ?? DefaultAboutPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "About",
};

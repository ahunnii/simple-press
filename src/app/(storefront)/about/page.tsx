import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { BambooAboutPage } from "../_templates/bamboo/bamboo-about-page";
import { DarkTrendAboutPage } from "../_templates/dark-trend/dark-trend-about-page";
import { DefaultAboutPage } from "../_templates/default/default-about-page";
import { HappyBambooAboutPage } from "../_templates/happy-bamboo/happy-bamboo-about-page";
import { ModernAboutPage } from "../_templates/modern/modern-about-page";
import { PollenAboutPage } from "../_templates/pollen/pollen-about-page";

export default async function AboutPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();
  const TemplateComponent =
    {
      "dark-trend": DarkTrendAboutPage,
      pollen: PollenAboutPage,
      modern: ModernAboutPage,
      bamboo: BambooAboutPage,
      "happy-bamboo": HappyBambooAboutPage,
    }[business.templateId] ?? DefaultAboutPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "About",
};

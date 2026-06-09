import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import { api } from "~/trpc/server";

import { BambooAboutPage } from "../_templates/bamboo/about/bamboo-about-page";
import { DarkTrendAboutPage } from "../_templates/dark-trend/about/dark-trend-about-page";
import { DefaultAboutPage } from "../_templates/default/about/default-about-page";
import { ElegantAboutPage } from "../_templates/elegant/about/elegant-about-page";
import { HappyBambooAboutPage } from "../_templates/happy-bamboo/about/happy-bamboo-about-page";
import { ModernAboutPage } from "../_templates/modern/about/modern-about-page";
import { NoiseAboutPage } from "../_templates/noise/about/noise-about-page";
import { PollenAboutPage } from "../_templates/pollen/about/pollen-about-page";
import { SledgeAboutPage } from "../_templates/sledge/about/sledge-about-page";

export default async function AboutPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();
  const TemplateComponent =
    {
      "dark-trend": DarkTrendAboutPage,
      elegant: ElegantAboutPage,
      pollen: PollenAboutPage,
      modern: ModernAboutPage,
      bamboo: BambooAboutPage,
      "happy-bamboo": HappyBambooAboutPage,
      noise: NoiseAboutPage,
      sledge: SledgeAboutPage,
    }[business.templateId] ?? DefaultAboutPage;

  return <TemplateComponent business={business} />;
}

export async function generateMetadata() {
  const business = await api.business.simplifiedGet();
  return {
    title: "About",
    ...(business && {
      alternates: {
        canonical: getCanonicalUrl(business, "/about"),
      },
    }),
  };
}

import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { BambooCollectionsPage } from "../_templates/bamboo/collections/bamboo-collections-page";
import { DarkTrendCollectionsPage } from "../_templates/dark-trend/collections/dark-trend-collections-page";
import { DefaultCollectionsPage } from "../_templates/default/collections/default-collections-page";
import { ElegantCollectionsPage } from "../_templates/elegant/collections/elegant-collections-page";
import { HappyBambooCollectionsPage } from "../_templates/happy-bamboo/collections/happy-bamboo-collections-page";
import { ModernCollectionsPage } from "../_templates/modern/collections/modern-collections-page";
import { NoiseCollectionsPage } from "../_templates/noise/collections/noise-collections-page";
import { PollenCollectionsPage } from "../_templates/pollen/collections/pollen-collections-page";

export default async function CollectionsPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const collections = await api.collections.getAllPublic();

  const TemplateComponent =
    {
      "happy-bamboo": HappyBambooCollectionsPage,
      bamboo: BambooCollectionsPage,
      "dark-trend": DarkTrendCollectionsPage,
      elegant: ElegantCollectionsPage,
      modern: ModernCollectionsPage,
      noise: NoiseCollectionsPage,
      pollen: PollenCollectionsPage,
    }[business.templateId] ?? DefaultCollectionsPage;

  return <TemplateComponent collections={collections} business={business} />;
}

export const metadata = {
  title: "Collections",
};

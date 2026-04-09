import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { BambooCollectionPage } from "../../_templates/bamboo/collections/bamboo-collection-page";
import { DarkTrendCollectionPage } from "../../_templates/dark-trend/collections/dark-trend-collection-page";
import { DefaultCollectionPage } from "../../_templates/default/collections/default-collection-page";
import { ElegantCollectionPage } from "../../_templates/elegant/collections/elegant-collection-page";
import { HappyBambooCollectionPage } from "../../_templates/happy-bamboo/collections/happy-bamboo-collection-page";
import { ModernCollectionPage } from "../../_templates/modern/collections/modern-collection-page";
import { NoiseCollectionPage } from "../../_templates/noise/collections/noise-collection-page";
import { PollenCollectionPage } from "../../_templates/pollen/collections/pollen-collection-page";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const collection = await api.collections
    .getBySlug(slug)
    .catch(() => notFound());

  if (!collection.published) {
    notFound();
  }

  const additionalCollections = await api.collections.getAllPublic();

  const TemplateComponent =
    {
      "happy-bamboo": HappyBambooCollectionPage,
      bamboo: BambooCollectionPage,
      "dark-trend": DarkTrendCollectionPage,
      elegant: ElegantCollectionPage,
      modern: ModernCollectionPage,
      noise: NoiseCollectionPage,
      pollen: PollenCollectionPage,
    }[business.templateId] ?? DefaultCollectionPage;

  return (
    <TemplateComponent
      business={business}
      collection={collection}
      additionalCollections={additionalCollections}
    />
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const business = await api.business.simplifiedGet();

  if (!business) {
    return { title: "Collection Not Found" };
  }

  try {
    const collection = await api.collections.getBySlug(slug);
    if (!collection.published) {
      return { title: "Collection Not Found" };
    }

    return {
      title: collection.metaTitle ?? `${collection.name} | ${business.name}`,
      description:
        collection.metaDescription ??
        collection.description ??
        `Shop ${collection.name} at ${business.name}`,
    };
  } catch {
    return { title: "Collection Not Found" };
  }
}

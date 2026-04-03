import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { DefaultCollectionPage } from "../../_templates/default/default-collection-page";
import { HappyBambooCollectionPage } from "../../_templates/happy-bamboo/happy-bamboo-collection-page";

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

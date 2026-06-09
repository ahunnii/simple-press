import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import { JsonLd } from "~/components/json-ld";
import {
  buildBreadcrumbSchema,
  buildCollectionSchema,
} from "~/lib/structured-data";
import { api } from "~/trpc/server";

import { BambooCollectionPage } from "../../_templates/bamboo/collections/bamboo-collection-page";
import { DarkTrendCollectionPage } from "../../_templates/dark-trend/collections/dark-trend-collection-page";
import { DefaultCollectionPage } from "../../_templates/default/collections/default-collection-page";
import { ElegantCollectionPage } from "../../_templates/elegant/collections/elegant-collection-page";
import { HappyBambooCollectionPage } from "../../_templates/happy-bamboo/collections/happy-bamboo-collection-page";
import { ModernCollectionPage } from "../../_templates/modern/collections/modern-collection-page";
import { NoiseCollectionPage } from "../../_templates/noise/collections/noise-collection-page";
import { PollenCollectionPage } from "../../_templates/pollen/collections/pollen-collection-page";
import { SledgeCollectionPage } from "../../_templates/sledge/collections/sledge-collection-page";

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
      sledge: SledgeCollectionPage,
    }[business.templateId] ?? DefaultCollectionPage;

  const collectionSchema = buildCollectionSchema(collection, business);
  const breadcrumbSchema = buildBreadcrumbSchema(business, [
    { name: "Home", path: "/" },
    { name: "Collections", path: "/collections" },
    { name: collection.name, path: `/collections/${collection.slug}` },
  ]);

  return (
    <>
      <JsonLd data={[collectionSchema, breadcrumbSchema]} />
      <TemplateComponent
        business={business}
        collection={collection}
        additionalCollections={additionalCollections}
      />
    </>
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

    const title =
      collection.metaTitle ?? `${collection.name} | ${business.name}`;
    const description =
      collection.metaDescription ??
      collection.description ??
      `Shop ${collection.name} at ${business.name}`;

    // Build OG/Twitter images: prefer per-collection ogImage (with dimensions),
    // fall back to site OG image / logo (S1, S4).
    const ogImages = collection.ogImage
      ? [
          {
            url: collection.ogImage,
            width: 1200,
            height: 630,
            alt: collection.name,
          },
        ]
      : business.siteContent?.ogImage ?? business.siteContent?.logoUrl
        ? [
            business.siteContent.ogImage ??
              business.siteContent.logoUrl ??
              "/placeholder.svg",
          ]
        : undefined;

    return {
      title,
      description,
      keywords: collection.metaKeywords ?? undefined,
      alternates: {
        canonical: getCanonicalUrl(business, `/collections/${slug}`),
      },
      openGraph: {
        title,
        description,
        images: ogImages,
      },
      twitter: {
        card: "summary_large_image" as const,
        title,
        description,
        images: ogImages,
      },
    };
  } catch {
    return { title: "Collection Not Found" };
  }
}

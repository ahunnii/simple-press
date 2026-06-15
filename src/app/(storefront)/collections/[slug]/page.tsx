import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import {
  buildBreadcrumbSchema,
  buildCollectionSchema,
} from "~/lib/structured-data";
import { api } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

import { getTemplate } from "../../_templates/registry";

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

  const t = getTemplate(business.templateId);

  const collectionSchema = buildCollectionSchema(collection, business);
  const breadcrumbSchema = buildBreadcrumbSchema(business, [
    { name: "Home", path: "/" },
    { name: "Collections", path: "/collections" },
    { name: collection.name, path: `/collections/${collection.slug}` },
  ]);

  return (
    <>
      <JsonLd data={[collectionSchema, breadcrumbSchema]} />
      <t.CollectionPage
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
      : (business.siteContent?.ogImage ?? business.siteContent?.logoUrl)
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

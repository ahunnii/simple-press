import { notFound } from "next/navigation";

import {
  buildPageMetadata,
  getCachedBusiness,
  loadSeoBusiness,
  preferNonBlank,
} from "~/lib/seo";
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
  const business = await getCachedBusiness();
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
  const business = await loadSeoBusiness("/collections/[slug]");

  if (!business) {
    return { title: "Collection Not Found" };
  }

  try {
    const collection = await api.collections.getBySlug(slug);
    if (!collection.published) {
      return { title: "Collection Not Found" };
    }

    return buildPageMetadata({
      business,
      path: `/collections/${slug}`,
      // Bare name — `buildPageMetadata` appends the brand suffix itself.
      title: collection.name,
      description: preferNonBlank(
        collection.description,
        `Shop ${collection.name} at ${business.name}`,
      ),
      keywords: collection.metaKeywords,
      entity: {
        title: collection.metaTitle,
        description: collection.metaDescription,
        ogImage: collection.ogImage,
      },
      // Collection photo is the natural share image, ahead of the site-wide
      // OG image / logo the helper falls back to.
      ogImage: collection.imageUrl,
      ogImageAlt: collection.name,
    });
  } catch {
    return { title: "Collection Not Found" };
  }
}

import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import {
  buildPageMetadata,
  firstNonBlank,
  getCachedBusiness,
  loadSeoBusiness,
} from "~/lib/seo";
import {
  buildBreadcrumbSchema,
  buildProductSchema,
} from "~/lib/structured-data";
import { collectGalleryIds } from "~/lib/tiptap/gallery-ids";
import { api, HydrateClient } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

import { VariantImageProvider } from "../../_components/product-page/variant-image-context";
import { getTemplate } from "../../_templates/registry";

type Props = {
  params: Promise<{ slug: string }>;
};

// generateMetadata and the page component both need the same product — wrap
// the fetch in React's request-scoped cache() so the tRPC call (and its DB
// round trip) only runs once per request instead of twice. `api.*` calls
// from src/trpc/server.ts are plain promises, not query-client-backed, so
// they don't dedupe on their own (unlike `.prefetch()`).
const getCachedProduct = cache((slug: string) => api.product.get(slug));

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;

  // Find business
  const business = await getCachedBusiness();
  if (!business) notFound();
  // Find product
  const product = await getCachedProduct(slug);

  if (!product) {
    notFound();
  }

  // Canonicalize id-based URLs (e.g. from old saved carts) to the slug URL.
  // 308, not 307: the id form is never the canonical address of a product, so
  // crawlers and clients should stop asking for it.
  if (product.slug !== slug) {
    permanentRedirect(`/shop/${product.slug}`);
  }

  const { isEnabled } = await getBusinessFlags();
  const reviewsEnabled = isEnabled("reviews");

  const reviews = reviewsEnabled
    ? await api.review.listByProduct({ productId: product.id }).catch(() => [])
    : [];

  // Prefetch everything the client components on this page re-fetch via
  // `useQuery` (product-reviews.tsx, every template's `getRelated.useQuery`,
  // and any `GalleryBlock` inside the additional-information rich text) so
  // their data lands in the server-rendered HTML — crawlers never run the
  // client JS that would otherwise be the only thing fetching it. Each is
  // wrapped so one failing prefetch (e.g. a disabled feature) never breaks
  // the page; the inputs must match the client `useQuery` calls exactly or
  // the hydration cache key misses.
  const galleryIds = collectGalleryIds(product.additionalFields);
  await Promise.all([
    reviewsEnabled
      ? api.review.getProductStats
          .prefetch({ productId: product.id })
          .catch(() => undefined)
      : undefined,
    reviewsEnabled
      ? api.review.listByProduct
          .prefetch({
            productId: product.id,
            sortBy: "recent",
            rating: undefined,
          })
          .catch(() => undefined)
      : undefined,
    api.product.getRelated
      .prefetch({ productId: product.id })
      .catch(() => undefined),
    ...galleryIds.map((galleryId) =>
      api.gallery.getByIdPublic.prefetch(galleryId).catch(() => undefined),
    ),
  ]);

  const t = getTemplate(business.templateId);

  const productSchema = buildProductSchema(
    product,
    business,
    reviews.slice(0, 20),
    { includeReviews: reviewsEnabled },
  );
  const breadcrumbSchema = buildBreadcrumbSchema(business, [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: product.name, path: `/shop/${product.slug}` },
  ]);

  return (
    <HydrateClient>
      <JsonLd data={[productSchema, breadcrumbSchema]} />
      <VariantImageProvider>
        <t.ProductPage product={product} business={business} />
      </VariantImageProvider>
    </HydrateClient>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const [product, business] = await Promise.all([
    getCachedProduct(slug),
    loadSeoBusiness("/shop/[slug]"),
  ]);

  if (!product) return { title: "Product Not Found" };

  return buildPageMetadata({
    business,
    path: `/shop/${product.slug}`,
    title: product.name,
    // The excerpt is the short, share-shaped copy; the long description is the
    // fallback only when it is blank.
    description: firstNonBlank(product.excerpt, product.description),
    keywords: product.metaKeywords,
    entity: {
      title: product.metaTitle,
      description: product.metaDescription,
      ogImage: product.ogImage,
    },
    // The product photo is the natural share image, ahead of the site-wide
    // OG image / logo the helper falls back to.
    ogImage: product.images[0]?.url,
    ogImageAlt: product.name,
  });
}

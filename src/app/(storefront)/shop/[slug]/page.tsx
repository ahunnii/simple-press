import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import {
  buildBreadcrumbSchema,
  buildProductSchema,
} from "~/lib/structured-data";
import { api } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

import { VariantImageProvider } from "../../_components/product-page/variant-image-context";

import { getTemplate } from "../../_templates/registry";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;

  // Find business
  const business = await api.business.simplifiedGet();
  if (!business) notFound();
  // Find product
  const product = await api.product.get(slug);

  if (!product) {
    notFound();
  }

  const t = getTemplate(business.templateId);

  const productSchema = buildProductSchema(product, business);
  const breadcrumbSchema = buildBreadcrumbSchema(business, [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: product.name, path: `/shop/${product.slug}` },
  ]);

  return (
    <>
      <JsonLd data={[productSchema, breadcrumbSchema]} />
      <VariantImageProvider>
        <t.ProductPage product={product} business={business} />
      </VariantImageProvider>
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const [product, business] = await Promise.all([
    api.product.get(slug),
    api.business.simplifiedGet(),
  ]);

  if (!product) return { title: "Product Not Found" };

  const title = !!product.metaTitle?.trim()
    ? product.metaTitle.trim()
    : product.name;
  const description = !!product.metaDescription?.trim()
    ? product.metaDescription.trim()
    : product.description;

  const ogImages = product.ogImage
    ? [{ url: product.ogImage, width: 1200, height: 630, alt: product.name }]
    : undefined;

  return {
    title,
    description,
    keywords: product.metaKeywords ?? undefined,
    ...(business && {
      alternates: {
        canonical: getCanonicalUrl(business, `/shop/${slug}`),
      },
    }),
    openGraph: {
      title,
      description: description ?? "",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description: description ?? "",
      images: ogImages,
    },
  };
}

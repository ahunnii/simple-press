import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import { JsonLd } from "~/components/json-ld";
import {
  buildBreadcrumbSchema,
  buildProductSchema,
} from "~/lib/structured-data";
import { api } from "~/trpc/server";

import { BambooProductPage } from "../../_templates/bamboo/products/bamboo-product-page";
import { DarkTrendProductPage } from "../../_templates/dark-trend/products/dark-trend-product-page";
import { DefaultProductPage } from "../../_templates/default/products/default-product-page";
import { ElegantProductPage } from "../../_templates/elegant/products/elegant-product-page";
import { HappyBambooProductPage } from "../../_templates/happy-bamboo/products/happy-bamboo-product-page";
import { ModernProductPage } from "../../_templates/modern/products/modern-product-page";
import { NoiseProductPage } from "../../_templates/noise/products/noise-product-page";
import { PollenProductPage } from "../../_templates/pollen/products/pollen-product-page";
import { SledgeProductPage } from "../../_templates/sledge/products/sledge-product-page";

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

  const TemplateComponent =
    {
      modern: ModernProductPage,
      elegant: ElegantProductPage,
      bamboo: BambooProductPage,
      "dark-trend": DarkTrendProductPage,
      "happy-bamboo": HappyBambooProductPage,
      noise: NoiseProductPage,
      pollen: PollenProductPage,
      sledge: SledgeProductPage,
    }[business.templateId] ?? DefaultProductPage;

  const productSchema = buildProductSchema(product, business);
  const breadcrumbSchema = buildBreadcrumbSchema(business, [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: product.name, path: `/shop/${product.slug}` },
  ]);

  return (
    <>
      <JsonLd data={[productSchema, breadcrumbSchema]} />
      <TemplateComponent product={product} business={business} />
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

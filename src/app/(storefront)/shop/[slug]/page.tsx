import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { BambooProductPage } from "../../_templates/bamboo/products/bamboo-product-page";
import { DarkTrendProductPage } from "../../_templates/dark-trend/products/dark-trend-product-page";
import { DefaultProductPage } from "../../_templates/default/products/default-product-page";
import { ElegantProductPage } from "../../_templates/elegant/products/elegant-product-page";
import { HappyBambooProductPage } from "../../_templates/happy-bamboo/products/happy-bamboo-product-page";
import { ModernProductPage } from "../../_templates/modern/products/modern-product-page";
import { NoiseProductPage } from "../../_templates/noise/products/noise-product-page";
import { PollenProductPage } from "../../_templates/pollen/products/pollen-product-page";

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
    }[business.templateId] ?? DefaultProductPage;

  return <TemplateComponent product={product} />;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await api.product.get(slug);

  if (!product) return { title: "Product Not Found" };

  const title = product.metaTitle ?? product.name;
  const description = product.metaDescription ?? product.description;

  return {
    title,
    description,
    keywords: product.metaKeywords ?? undefined,
    openGraph: {
      title,
      description: description ?? "",
      images: product.ogImage
        ? [{ url: product.ogImage, width: 1200, height: 630, alt: product.name }]
        : undefined,
    },
  };
}

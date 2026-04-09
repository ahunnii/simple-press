import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { BambooGenericPage } from "../_templates/bamboo/bamboo-generic-page";
import { DarkTrendGenericPage } from "../_templates/dark-trend/dark-trend-generic-page";
import { DefaultGenericPage } from "../_templates/default/default-generic-page";
import { ElegantGenericPage } from "../_templates/elegant/elegant-generic-page";
import { HappyBambooGenericPage } from "../_templates/happy-bamboo/happy-bamboo-generic-page";
import { ModernGenericPage } from "../_templates/modern/modern-generic-page";
import { NoiseGenericPage } from "../_templates/noise/noise-generic-page";
import { PollenGenericPage } from "../_templates/pollen/pollen-generic-page";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PageView({ params }: Props) {
  const { slug } = await params;
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const page = await api.content.getPageBySlug({
    slug,
  });

  if (!page) notFound();

  const TemplateComponent =
    {
      "dark-trend": DarkTrendGenericPage,
      elegant: ElegantGenericPage,
      pollen: PollenGenericPage,
      bamboo: BambooGenericPage,
      "happy-bamboo": HappyBambooGenericPage,
      noise: NoiseGenericPage,
      modern: ModernGenericPage,
    }[business.templateId] ?? DefaultGenericPage;

  return <TemplateComponent business={business} page={page} />;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;

  const page = await api.content.getPageBySlug({
    slug,
  });

  if (!page) return { title: "Page Not Found" };

  return {
    title: !!page.metaTitle ? page.metaTitle : page.title,
    description: !!page.metaDescription ? page.metaDescription : page.excerpt,
  } as Metadata;
}

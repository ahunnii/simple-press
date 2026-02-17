import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { DarkTrendGenericPage } from "../_templates/dark-trend/dark-trend-generic-page";
import { DefaultGenericPage } from "../_templates/default/default-generic-page";
import { PollenGenericPage } from "../_templates/pollen/pollen-generic-page";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PageView({ params }: Props) {
  const { slug } = await params;
  const business = await api.business.simplifiedGet();

  const page = await api.content.getPageBySlug({
    slug,
  });

  if (!page) notFound();

  const TemplateComponent =
    {
      "dark-trend": DarkTrendGenericPage,
      pollen: PollenGenericPage,
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
  };
}

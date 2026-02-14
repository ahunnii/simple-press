import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { DarkTrendGenericPage } from "../_templates/dark-trend/dark-trend-generic-page";
import { DefaultGenericPage } from "../_templates/default/default-generic-page";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PageView({ params }: Props) {
  const { slug } = await params;
  const business = await api.business.get();

  if (!business) notFound();

  const page = await api.content.getPageBySlug({
    businessId: business.id,
    slug,
  });

  if (!page) notFound();

  const TemplateComponent =
    {
      "dark-trend": DarkTrendGenericPage,
    }[business.templateId] ?? DefaultGenericPage;

  return <TemplateComponent page={page} />;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const business = await api.business.get();

  if (!business) return { title: "Page Not Found" };

  const page = await api.content.getPageBySlug({
    businessId: business.id,
    slug,
  });

  if (!page) return { title: "Page Not Found" };

  return {
    title: !!page.metaTitle ? page.metaTitle : page.title,
    description: !!page.metaDescription ? page.metaDescription : page.excerpt,
  };
}

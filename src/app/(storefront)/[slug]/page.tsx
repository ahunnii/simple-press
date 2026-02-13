import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { DarkTrendGenericPage } from "../_templates/dark-trend/dark-trend-generic-page";
import { DefaultGenericPage } from "../_templates/default/default-generic-page";

export default async function PageView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await api.business.get();

  if (!business) {
    notFound();
  }

  const page = await api.content.getPageBySlug({
    businessId: business.id,
    slug,
  });

  if (!page) {
    notFound();
  }

  const TemplateComponent =
    {
      "dark-trend": DarkTrendGenericPage,
    }[business.templateId] ?? DefaultGenericPage;

  return <TemplateComponent page={page} />;
}

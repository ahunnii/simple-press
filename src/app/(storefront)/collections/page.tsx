import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { DefaultCollectionsPage } from "../_templates/default/default-collections-page";
import { HappyBambooCollectionsPage } from "../_templates/happy-bamboo/happy-bamboo-collections-page";

export default async function CollectionsPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const collections = await api.collections.getAllPublic();

  const TemplateComponent =
    {
      "happy-bamboo": HappyBambooCollectionsPage,
    }[business.templateId] ?? DefaultCollectionsPage;

  return <TemplateComponent collections={collections} />;
}

export const metadata = {
  title: "Collections",
};

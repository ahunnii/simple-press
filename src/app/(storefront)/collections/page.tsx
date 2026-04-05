import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { DefaultCollectionsPage } from "../_templates/default/default-collections-page";
import { HappyBambooCollectionsPage } from "../_templates/happy-bamboo/collections/happy-bamboo-collections-page";

export default async function CollectionsPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const collections = await api.collections.getAllPublic();

  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  if (business.templateId === "happy-bamboo") {
    return (
      <HappyBambooCollectionsPage
        collections={collections}
        customFields={customFields}
      />
    );
  }

  const TemplateComponent = DefaultCollectionsPage;
  return <TemplateComponent collections={collections} />;
}

export const metadata = {
  title: "Collections",
};

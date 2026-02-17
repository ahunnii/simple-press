import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { PollenServicesPage } from "../_templates/pollen/pollen-services-page";

export default async function ServicesPage() {
  const business = await api.business.simplifiedGet();

  if (business.templateId !== "pollen") {
    notFound();
  }

  const TemplateComponent =
    {
      pollen: PollenServicesPage,
    }[business.templateId] ?? PollenServicesPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Services",
};

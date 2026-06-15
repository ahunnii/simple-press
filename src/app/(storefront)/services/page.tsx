import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { getTemplate } from "../_templates/registry";

export default async function ServicesPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const t = getTemplate(business.templateId);

  if (!t.ServicesPage) {
    notFound();
  }

  return <t.ServicesPage business={business} />;
}

export const metadata = {
  title: "Services",
};

import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { DarkTrendContactPage } from "../_templates/dark-trend/dark-trend-contact-page";
import { DefaultContactPage } from "../_templates/default/default-contact-page";

export default async function ContactPage() {
  const business = await api.business.get();

  if (!business) notFound();

  const TemplateComponent =
    {
      "dark-trend": DarkTrendContactPage,
    }[business.templateId] ?? DefaultContactPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Contact Us",
};

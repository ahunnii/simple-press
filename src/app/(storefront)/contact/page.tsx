import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
import { api } from "~/trpc/server";

import { DarkTrendContactPage } from "../_templates/dark-trend/dark-trend-contact-page";
import { DefaultContactPage } from "../_templates/default/default-contact-page";
import { ContactForm } from "./_components/contact-form";

export default async function ContactPage() {
  const business = await api.business.get();

  if (!business) {
    notFound();
  }

  const TemplateComponent =
    {
      "dark-trend": DarkTrendContactPage,
    }[business.templateId] ?? DefaultContactPage;

  return <TemplateComponent business={business} />;
}

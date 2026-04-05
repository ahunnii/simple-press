import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { BambooContactPage } from "../_templates/bamboo/bamboo-contact-page";
import { DarkTrendContactPage } from "../_templates/dark-trend/dark-trend-contact-page";
import { DefaultContactPage } from "../_templates/default/default-contact-page";
import { HappyBambooContactPage } from "../_templates/happy-bamboo/contact/happy-bamboo-contact-page";
import { ModernContactPage } from "../_templates/modern/modern-contact-page";
import { PollenContactPage } from "../_templates/pollen/pollen-contact-page";

export default async function ContactPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();
  const TemplateComponent =
    {
      "dark-trend": DarkTrendContactPage,
      pollen: PollenContactPage,
      modern: ModernContactPage,
      bamboo: BambooContactPage,
      "happy-bamboo": HappyBambooContactPage,
    }[business.templateId] ?? DefaultContactPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Contact Us",
};

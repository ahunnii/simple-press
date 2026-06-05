import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { BambooContactPage } from "../_templates/bamboo/contact/bamboo-contact-page";
import { DarkTrendContactPage } from "../_templates/dark-trend/contact/dark-trend-contact-page";
import { DefaultContactPage } from "../_templates/default/contact/default-contact-page";
import { ElegantContactPage } from "../_templates/elegant/contact/elegant-contact-page";
import { HappyBambooContactPage } from "../_templates/happy-bamboo/contact/happy-bamboo-contact-page";
import { ModernContactPage } from "../_templates/modern/contact/modern-contact-page";
import { NoiseContactPage } from "../_templates/noise/contact/noise-contact-page";
import { PollenContactPage } from "../_templates/pollen/contact/pollen-contact-page";
import { SledgeContactPage } from "../_templates/sledge/contact/sledge-contact-page";

export default async function ContactPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();
  const TemplateComponent =
    {
      "dark-trend": DarkTrendContactPage,
      elegant: ElegantContactPage,
      pollen: PollenContactPage,
      modern: ModernContactPage,
      bamboo: BambooContactPage,
      "happy-bamboo": HappyBambooContactPage,
      noise: NoiseContactPage,
      sledge: SledgeContactPage,
    }[business.templateId] ?? DefaultContactPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Contact Us",
};

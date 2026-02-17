import { api } from "~/trpc/server";

import { DarkTrendContactPage } from "../_templates/dark-trend/dark-trend-contact-page";
import { DefaultContactPage } from "../_templates/default/default-contact-page";
import { PollenContactPage } from "../_templates/pollen/pollen-contact-page";

export default async function ContactPage() {
  const business = await api.business.simplifiedGet();

  const TemplateComponent =
    {
      "dark-trend": DarkTrendContactPage,
      pollen: PollenContactPage,
    }[business.templateId] ?? DefaultContactPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Contact Us",
};

import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { DefaultAboutPage } from "../_templates/default/default-about-page";
import { ModernAboutPage } from "../_templates/modern/modern-about-page";

export default async function AboutPage() {
  const business = await api.business.get({ includeProducts: true });

  if (!business) {
    notFound();
  }

  if (business.templateId === "modern") {
    return <ModernAboutPage business={business} />;
  }

  return <DefaultAboutPage business={business} />;
}

import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import { api } from "~/trpc/server";

import { getTemplate } from "../_templates/registry";

export default async function ContactPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const t = getTemplate(business.templateId);

  return <t.ContactPage business={business} />;
}

export async function generateMetadata() {
  const business = await api.business.simplifiedGet();
  return {
    title: "Contact Us",
    ...(business && {
      alternates: {
        canonical: getCanonicalUrl(business, "/contact"),
      },
    }),
  };
}

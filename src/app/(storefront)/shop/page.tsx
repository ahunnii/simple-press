import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import { api } from "~/trpc/server";

import { getTemplate } from "../_templates/registry";

export default async function ProductsPage() {
  const business = await api.business.getWithProducts();

  if (!business) notFound();

  const t = getTemplate(business.templateId);

  return <t.ShopPage business={business} />;
}

export async function generateMetadata() {
  const business = await api.business.simplifiedGet();
  return {
    title: "Shop",
    ...(business && {
      alternates: {
        canonical: getCanonicalUrl(business, "/shop"),
      },
    }),
  };
}

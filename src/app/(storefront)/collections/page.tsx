import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { buildPageMetadata } from "~/lib/seo";
import { api } from "~/trpc/server";

import { getTemplate } from "../_templates/registry";

export default async function CollectionsPage() {
  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("collections")) notFound();

  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const collections = await api.collections.getAllPublic();

  const t = getTemplate(business.templateId);

  return <t.CollectionsPage collections={collections} business={business} />;
}

export async function generateMetadata() {
  const business = await api.business.simplifiedGet().catch(() => null);
  return buildPageMetadata({
    business,
    path: "/collections",
    pageMetaKey: "collections",
    title: "Collections",
  });
}

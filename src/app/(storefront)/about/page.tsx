import { notFound } from "next/navigation";

import { buildPageMetadata, loadSeoBusiness } from "~/lib/seo";
import {
  buildBreadcrumbSchema,
  buildWebPageSchema,
} from "~/lib/structured-data";
import { api } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

import { getTemplate } from "../_templates/registry";

export default async function AboutPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const t = getTemplate(business.templateId);

  const webPageSchema = buildWebPageSchema(business, {
    type: "AboutPage",
    name: "About",
    path: "/about",
  });
  const breadcrumbSchema = buildBreadcrumbSchema(business, [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ]);

  return (
    <>
      <JsonLd data={[webPageSchema, breadcrumbSchema]} />
      <t.AboutPage business={business} />
    </>
  );
}

export async function generateMetadata() {
  const business = await loadSeoBusiness("/about");
  return buildPageMetadata({
    business,
    path: "/about",
    pageMetaKey: "about",
    title: "About",
    description: business?.siteContent?.metaDescription,
  });
}
